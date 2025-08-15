from fastapi import APIRouter, File, UploadFile, Request, Form
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

@router.get("/api/dataset-preview")
async def get_dataset_preview(request: Request):
    """
    Return a preview of the current dataset (title row and first 10 rows)
    """
    df = getattr(request.app.state, "df", None)
    if df is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet. Please complete question 1 first."})
    
    # Get column names as the title row
    title_row = df.columns.tolist()
    
    # Get first 10 rows of data
    data_rows = df.head(10).values.tolist()
    
    # Convert numpy values to native Python types for JSON serialization
    def convert_numpy_values(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        else:
            return obj
    
    # Convert all values in data rows
    converted_data_rows = []
    for row in data_rows:
        converted_row = [convert_numpy_values(cell) for cell in row]
        converted_data_rows.append(converted_row)
    
    return {
        "success": True,
        "title_row": title_row,
        "data_rows": converted_data_rows
    }

@router.post("/api/submit-feature-names")
async def submit_feature_names(request: Request, featureNames: str = Form(...)):
    """
    Handle submission of question 1: feature names configuration
    """
    if featureNames not in ["true", "false"]:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid featureNames value. Must be 'true' or 'false'."})
    
    # Store the feature names configuration
    request.app.state.feature_names = featureNames == "true"
    
    # Process the data with the feature names configuration
    file = getattr(request.app.state, "latest_uploaded_file", None)
    filename = getattr(request.app.state, "latest_uploaded_filename", None)
    
    if file is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded yet."})
    
    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".csv":
            if not request.app.state.feature_names:
                df = pd.read_csv(io.BytesIO(file), header=None)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_csv(io.BytesIO(file))
        else:
            if not request.app.state.feature_names:
                df = pd.read_excel(io.BytesIO(file), header=None)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_excel(io.BytesIO(file))
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Could not read uploaded file."})
    
    if df.empty:
        return JSONResponse(status_code=400, content={"success": False, "message": "Uploaded file is empty."})
    
    # Store the processed dataframe
    request.app.state.df = df
    
    return {"success": True, "message": "Feature names configuration saved successfully."}

@router.post("/api/submit-missing-data-options")
async def submit_missing_data_options(request: Request, missingDataOptions: str = Form(...)):
    """
    Handle submission of question 2: missing data options
    """
    try:
        missing_data_options = json.loads(missingDataOptions)
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid missingDataOptions format."})
    
    # Validate required fields
    required_fields = ["blanks", "na", "other", "otherText"]
    for field in required_fields:
        if field not in missing_data_options:
            return JSONResponse(status_code=400, content={"success": False, "message": f"Missing required field: {field}"})
    
    # Store the missing data options
    request.app.state.missing_data_options = missing_data_options
    
    # Get the current dataframe
    df = getattr(request.app.state, "df", None)
    if df is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet. Please complete question 1 first."})
    
    # Apply missing data replacements
    df_processed = df.copy()
    
    if missing_data_options["na"]:
        df_processed.replace("N/A", np.nan, inplace=True)
    
    other_text = missing_data_options.get("otherText", "")
    if other_text and missing_data_options["other"]:
        for text in other_text.split(","):
            text = text.strip()
            if text.isnumeric():
                df_processed.replace(float(text), np.nan, inplace=True)
            else:
                df_processed.replace(text, np.nan, inplace=True)
    
    # Store the processed dataframe
    request.app.state.df = df_processed
    
    return {"success": True, "message": "Missing data options saved successfully."}

@router.post("/api/submit-target-feature")
async def submit_target_feature(request: Request, targetFeature: str = Form(...), targetType: str = Form(...)):
    """
    Handle submission of question 3: target feature configuration
    """
    # Handle skip case (empty target feature)
    if not targetFeature or not targetType:
        # Store empty target feature configuration
        request.app.state.target_feature = ""
        request.app.state.target_type = ""
        
        # Get the current dataframe
        df = getattr(request.app.state, "df", None)
        if df is None:
            return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet. Please complete previous questions first."})
        
        # Apply label encoding for all categorical columns
        df_encoded = df.copy()
        for col in df_encoded.columns:
            if df_encoded[col].dtype == 'object':
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
        
        # Ensure label encoding doesn't replace NaN values
        df_encoded.where(~df.isna(), df, inplace=True)
        
        # Store the final processed dataframe
        request.app.state.df = df_encoded
        
        return {"success": True, "message": "Target feature configuration skipped successfully."}
    
    if targetType not in ["numerical", "categorical"]:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid target type. Must be 'numerical' or 'categorical'."})
    
    # Store the target feature configuration
    request.app.state.target_feature = targetFeature
    request.app.state.target_type = targetType
    
    # Get the current dataframe
    df = getattr(request.app.state, "df", None)
    if df is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet. Please complete previous questions first."})
    
    # Check if target feature exists in the dataframe
    if targetFeature not in df.columns:
        return JSONResponse(status_code=400, content={"success": False, "message": f"Target feature '{targetFeature}' not found in the dataset."})
    
    # Apply label encoding for categorical columns (excluding target feature if it's categorical)
    df_encoded = df.copy()
    for col in df_encoded.columns:
        if col != targetFeature and df_encoded[col].dtype == 'object':
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
    
    # Ensure label encoding doesn't replace NaN values
    df_encoded.where(~df.isna(), df, inplace=True)
    
    # Store the final processed dataframe
    request.app.state.df = df_encoded
    
    return {"success": True, "message": "Target feature configuration saved successfully."}

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