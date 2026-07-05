import os
import uuid
import aiofiles
from datetime import date
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, LabReport, LabParameter, ClinicalSummary, ReportStatus
from app.schemas import LabReportOut, ReportDetailOut, LabParameterOut, ClinicalSummaryOut, LabParameterUpdate
from app.auth import get_current_user
from app.config import settings
from app.ocr import extract_parameters_from_file
from app.agent import run_analysis
from typing import List

router = APIRouter(prefix="/reports", tags=["reports"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


async def process_report(report_id: int, file_path: str, db_session_factory):
    """Background task: OCR → Agent → Save results."""
    async with db_session_factory() as db:
        try:
            # Set status to processing
            result = await db.execute(select(LabReport).where(LabReport.id == report_id))
            report = result.scalar_one_or_none()
            if not report:
                return
            report.status = ReportStatus.PROCESSING
            await db.commit()

            # 1. Extract parameters via OCR/Vision
            raw_params = await extract_parameters_from_file(file_path)
            if not raw_params:
                report.status = ReportStatus.FAILED
                await db.commit()
                return

            # 2. Run AI agent
            analysis = await run_analysis(raw_params)

            # 3. Save parameters
            for p in analysis["parameters"]:
                param = LabParameter(
                    report_id=report_id,
                    parameter_name=p.get("parameter_name", ""),
                    value=float(p.get("value", 0)),
                    unit=p.get("unit", ""),
                    status=p.get("status", "normal"),
                    reference_min=p.get("reference_min"),
                    reference_max=p.get("reference_max"),
                    explanation=p.get("explanation"),
                )
                db.add(param)

            # 4. Save clinical summary
            summary = ClinicalSummary(
                report_id=report_id,
                summary_text=analysis["summary_text"],
                recommendation_text=analysis["recommendation_text"],
                abnormal_count=analysis["abnormal_count"],
            )
            db.add(summary)

            report.status = ReportStatus.COMPLETED
            await db.commit()

        except Exception as e:
            import traceback
            print(f"[process_report] ERROR report_id={report_id}: {e}")
            traceback.print_exc()
            try:
                result = await db.execute(select(LabReport).where(LabReport.id == report_id))
                rpt = result.scalar_one_or_none()
                if rpt:
                    rpt.status = ReportStatus.FAILED
                    await db.commit()
            except Exception:
                pass


@router.post("/upload", response_model=LabReportOut, status_code=201)
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, detail="Only PDF, JPG, PNG, or WebP files are accepted")

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(400, detail=f"File too large (max {settings.MAX_FILE_SIZE_MB} MB)")

    # Save file
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{suffix}"
    file_path = upload_dir / filename

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Create report record
    report = LabReport(
        user_id=current_user.id,
        file_url=str(file_path),
        report_date=date.today(),
        status=ReportStatus.PENDING,
        original_filename=file.filename,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    report_id = report.id

    await db.commit()

    # Kick off background processing
    from app.database import AsyncSessionLocal
    background_tasks.add_task(process_report, report_id, str(file_path), AsyncSessionLocal)

    return LabReportOut.model_validate(report)


@router.get("/", response_model=List[LabReportOut])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LabReport)
        .where(LabReport.user_id == current_user.id)
        .order_by(LabReport.created_at.desc())
    )
    return [LabReportOut.model_validate(r) for r in result.scalars().all()]


@router.get("/{report_id}", response_model=ReportDetailOut)
async def get_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LabReport).where(LabReport.id == report_id, LabReport.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, detail="Report not found")

    params_result = await db.execute(
        select(LabParameter).where(LabParameter.report_id == report_id)
    )
    parameters = params_result.scalars().all()

    summary_result = await db.execute(
        select(ClinicalSummary).where(ClinicalSummary.report_id == report_id)
    )
    summary = summary_result.scalar_one_or_none()

    return ReportDetailOut(
        report=LabReportOut.model_validate(report),
        parameters=[LabParameterOut.model_validate(p) for p in parameters],
        clinical_summary=ClinicalSummaryOut.model_validate(summary) if summary else None,
    )


@router.delete("/{report_id}", status_code=204)
async def delete_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LabReport).where(LabReport.id == report_id, LabReport.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, detail="Report not found")
    await db.delete(report)
