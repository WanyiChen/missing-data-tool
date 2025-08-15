from fastapi import APIRouter, File, UploadFile, Request
from fastapi.responses import JSONResponse
from sklearn.preprocessing import LabelEncoder
from typing import Dict
import os
import pandas as pd
import numpy as np
import io
import json

__all__ = ["latest_uploaded_file", "latest_uploaded_filename", "df"]

router = APIRouter()

@router.get("/")
def read_root():
    return {"message": "Hello World"}

@router.post("/api/validate-upload")
async def validate_upload(request: Request, file: UploadFile = File(...)):
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
    request.app.state.latest_uploaded_file = contents
    request.app.state.latest_uploaded_filename = filename

    return {"success": True, "message": "File is valid."}

def reformatData(addFeatureNames: bool, missing_data_options: Dict, request: Request):
    file = getattr(request.app.state, "latest_uploaded_file", None)
    filename = getattr(request.app.state, "latest_uploaded_filename", None)
    if file is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded yet."})
    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".csv":
            if addFeatureNames:
                df = pd.read_csv(io.BytesIO(file), header=None)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_csv(io.BytesIO(file))
        else:
            if addFeatureNames:
                df = pd.read_excel(io.BytesIO(file), header=None)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_excel(io.BytesIO(file))
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Could not read uploaded file."})
    if df.empty:
        return JSONResponse(status_code=400, content={"success": False, "message": "Uploaded file is empty."})

    # Replace missing values based on options
    if missing_data_options["na"] == True:
        df.replace("N/A", np.nan, inplace=True)
    
    other_text = missing_data_options.get("otherText", "")
    if other_text:
        for text in other_text.split(","):
            text = text.strip()
            if text.isnumeric():
                df.replace(float(text), np.nan, inplace=True)
            else:
                df.replace(text, np.nan, inplace=True)

    df_encoded = df.copy()
    for col in df_encoded.columns:
        if df_encoded[col].dtype == 'object':
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col].astype(str)) # Handle categorical data by converting to ints
    
    # Ensure label encoding doesn't replace NaN values
    df_encoded.where(~df.isna(), df, inplace=True)

    request.app.state.df = df_encoded

    # Initialize feature cache after data is loaded
    from .features_routes import initialize_feature_cache
    initialize_feature_cache(df_encoded)

    return None

@router.post("/api/submit-data")
async def submit_data(request: Request, featureNames: str = File(...), missingDataOptions: str = File(...), targetFeature: str = File(...), targetType: str = File(...)):
    
    if not featureNames:
        return JSONResponse(status_code=400, content={"success": False, "message": "Feature names are required."})

    try:
        missing_data_options = json.loads(missingDataOptions)
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid missingDataOptions format."})

    if not targetFeature or not targetType:
        return JSONResponse(status_code=400, content={"success": False, "message": "Missing target feature or type."})
    
    request.app.state.target_feature = targetFeature
    request.app.state.target_type = targetType
    
    dataReformatError = reformatData(featureNames == "false", missing_data_options, request)
    if dataReformatError is not None:
        return dataReformatError
    
    return {"success": True, "message": "Data received successfully."} 