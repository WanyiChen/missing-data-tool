from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import os
import pandas as pd
import io
import json

app = FastAPI()

# Global variable to store uploaded file content (for demo purposes)
latest_uploaded_file = None
latest_uploaded_filename = None

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.post("/api/validate-upload")
async def validate_upload(file: UploadFile = File(...)):
    MAX_SIZE = 100 * 1024 * 1024  # 100 MB
    ACCEPTED_EXTENSIONS = {".csv", ".xls", ".xlsx"}

    # Check extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ACCEPTED_EXTENSIONS:
        return JSONResponse(status_code=400, content={"success": False, "message": "Sorry, your file format is not recognized. The supported file formats are csv, xls, and xlsx."})

    # Read file content
    contents = await file.read()
    
    # Check size
    size = len(contents)
    if size > MAX_SIZE:
        return JSONResponse(status_code=400, content={"success": False, "message": "Sorry, your file is too large. The maximum file size is 100MB."})

    # Use pandas to check for actual data
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:  # .xls or .xlsx
            df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Sorry, we could not read your file. Please ensure it is a valid and uncorrupted file."})

    if df.empty:
        return JSONResponse(status_code=400, content={"success": False, "message": "Sorry, your file appears to be empty. Please double check."})

    # Save file content globally for later use
    global latest_uploaded_file, latest_uploaded_filename
    latest_uploaded_file = contents
    latest_uploaded_filename = filename

    return {"success": True, "message": "File is valid."}

@app.post("/api/submit-data")
async def submit_data(
    missingDataOptions: str = File(...),
    targetFeature: str = File(...),
    targetType: str = File(...)
):
    # Validate variables
    if not targetFeature or not targetType:
        return JSONResponse(status_code=400, content={"success": False, "message": "Missing target feature or type."})
    
    try:
        missing_data_options = json.loads(missingDataOptions)
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid missingDataOptions format."})

    return {"success": True, "message": "Data received successfully."}