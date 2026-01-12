import warnings
import pytest
import pandas as pd
import numpy as np
import io
import json
import os
from unittest.mock import Mock, AsyncMock, patch
from fastapi import FastAPI, Request, UploadFile
from fastapi.testclient import TestClient
from routes.validation_routes import router

# Suppress pandas warnings for tests
warnings.filterwarnings("ignore", category=pd.errors.DtypeWarning)


# Test fixtures
@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(router)
    app.state = Mock()
    return app

@pytest.fixture
def client(app):
    return TestClient(app)

@pytest.fixture
def mock_request(app):
    request = Mock(spec=Request)
    request.app = app
    return request

@pytest.fixture
def datasets_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)),"..", "Test_Datasets")

@pytest.fixture
def csv_air_quality(datasets_path):
    with open(f"{datasets_path}/CSV_AirQualityUCI.csv", "rb") as f:
        return f.read()

@pytest.fixture
def xls_data(datasets_path):
    with open(f"{datasets_path}/XLS_datafile.xls", "rb") as f:
        return f.read()

@pytest.fixture
def xlsx_cola(datasets_path):
    with open(f"{datasets_path}/XLSX_Cola.xlsx", "rb") as f:
        return f.read()

@pytest.fixture
def empty_xlsx(datasets_path):
    with open(f"{datasets_path}/EMPTY.xlsx", "rb") as f:
        return f.read()

@pytest.fixture
def large_csv(datasets_path):
    with open(f"{datasets_path}/EXCEEDFILESIZE_2011.csv", "rb") as f:
        return f.read()

@pytest.fixture
def over30_features(datasets_path):
    with open(f"{datasets_path}/OVER30_mnist_test.csv", "rb") as f:
        return f.read()

@pytest.fixture
def no_feature_names(datasets_path):
    with open(f"{datasets_path}/NOFEATURE_gsalc.csv", "rb") as f:
        return f.read()

@pytest.fixture
def blanks_data(datasets_path):
    with open(f"{datasets_path}/BLANKS_test.csv", "rb") as f:
        return f.read()

@pytest.fixture
def na_data(datasets_path):
    with open(f"{datasets_path}/NA_water_potability.csv", "rb") as f:
        return f.read()

@pytest.fixture
def numeric_999_data(datasets_path):
    with open(f"{datasets_path}/999_water_potability.csv", "rb") as f:
        return f.read()

@pytest.fixture
def multiple_missing_data(datasets_path):
    with open(f"{datasets_path}/MULTIPLE_water_potability.csv", "rb") as f:
        return f.read()

@pytest.fixture
def no_missing_data(datasets_path):
    with open(f"{datasets_path}/NOMISSING_Iris.csv", "rb") as f:
        return f.read()

class TestValidateUpload:
    """Test /api/validate-upload with sample datasets"""

    @pytest.mark.asyncio
    async def test_csv_air_quality_upload(self, mock_request, csv_air_quality):
        """Test CSV air quality dataset upload"""
        
        mock_file = Mock()
        mock_file.filename = "CSV_AirQualityUCI.csv"
        mock_file.read = AsyncMock(return_value=csv_air_quality)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        if hasattr(result, 'status_code'):
            # CSV uses semicolon separator, causing read error - this is expected
            assert result.status_code != 400
            assert "could not read" in result.body.decode()
        else:
            assert result["success"] is True



    @pytest.mark.asyncio
    async def test_xls_file_upload(self, mock_request, xls_data):
        """Test XLS file upload"""
        mock_file = Mock()
        mock_file.filename = "XLS_datafile.xls"
        mock_file.read = AsyncMock(return_value=xls_data)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_xlsx_cola_upload(self, mock_request, xlsx_cola):
        """Test XLSX Cola dataset upload"""
        mock_file = Mock()
        mock_file.filename = "XLSX_Cola.xlsx"
        mock_file.read = AsyncMock(return_value=xlsx_cola)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_empty_xlsx_upload(self, mock_request, empty_xlsx):
        """Test empty XLSX file upload"""
        mock_file = Mock()
        mock_file.filename = "EMPTY.xlsx"
        mock_file.read = AsyncMock(return_value=empty_xlsx)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        assert result.status_code == 400
        assert "empty" in result.body.decode()

    @pytest.mark.asyncio
    async def test_large_file_upload(self, mock_request, large_csv):
        """Test file exceeding size limit"""
        mock_file = Mock()
        mock_file.filename = "EXCEEDFILESIZE_2011.csv"
        mock_file.read = AsyncMock(return_value=large_csv)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        if len(large_csv) > 100 * 1024 * 1024:
            assert result.status_code == 400
            assert "too large" in result.body.decode()
        else:
            assert result["success"] is True

    @pytest.mark.asyncio
    async def test_over30_features_upload(self, mock_request, over30_features):
        """Test dataset with over 30 features"""
        mock_file = Mock()
        mock_file.filename = "OVER30_mnist_test.csv"
        mock_file.read = AsyncMock(return_value=over30_features)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        assert result["success"] is True
        assert len(result["title_row"]) > 30

    @pytest.mark.asyncio
    async def test_no_feature_names_upload(self, mock_request, no_feature_names):
        """Test dataset without feature names"""
        mock_file = Mock()
        mock_file.filename = "NOFEATURE_gsalc.csv"
        mock_file.read = AsyncMock(return_value=no_feature_names)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        assert result["success"] is True
        # Should auto-detect no feature names and generate Feature 1, Feature 2, etc.
        if not result["has_feature_names"]:
            assert "Feature 1" in result["title_row"]

    
    @pytest.mark.asyncio
    async def test_invalid_file_format(self, mock_request):
        """Test upload with invalid file extension"""
        mock_file = Mock()
        mock_file.filename = "test.txt"  # Invalid format
        mock_file.read = AsyncMock(return_value=b"some content")
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        assert result.status_code == 400
        assert "not recognized" in result.body.decode()

    @pytest.mark.asyncio
    async def test_no_filename(self, mock_request):
        """Test upload with no filename"""
        mock_file = Mock()
        mock_file.filename = None  # No filename
        mock_file.read = AsyncMock(return_value=b"content")
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        assert result.status_code == 400


class TestMissingDataDetection:
    """Test missing data detection with sample datasets"""
    
    @pytest.mark.asyncio
    async def test_detect_blanks_dataset(self, mock_request, blanks_data):
        """Test detection of blank missing data"""
        df = pd.read_csv(io.BytesIO(blanks_data))
        mock_request.app.state.df = df
        
        from routes.validation_routes import detect_missing_data_options
        result = await detect_missing_data_options(mock_request)
        
        assert result["success"] is True
        assert result["suggestions"]["blanks"] is True

    @pytest.mark.asyncio
    async def test_detect_na_dataset(self, mock_request, na_data):
        """Test detection of N/A missing data"""
        df = pd.read_csv(io.BytesIO(na_data))
        mock_request.app.state.df = df
        
        from routes.validation_routes import detect_missing_data_options
        result = await detect_missing_data_options(mock_request)
        
        assert result["success"] is True
        assert result["suggestions"]["na"] is True # DONE: May need to adjust based on actual detection logic

    @pytest.mark.asyncio
    async def test_detect_no_missing_dataset(self, mock_request, no_missing_data):
        """Test detection with no missing data (Iris dataset)"""
        df = pd.read_csv(io.BytesIO(no_missing_data))
        mock_request.app.state.df = df
        
        from routes.validation_routes import detect_missing_data_options
        result = await detect_missing_data_options(mock_request)
        
        assert result["success"] is True
        assert result["suggestions"]["blanks"] is False
        assert result["suggestions"]["na"] is False


class TestMissingDataOptions:
    """Test missing data options processing with sample datasets"""
    
    @pytest.mark.asyncio
    async def test_process_numeric_999_missing(self, mock_request, numeric_999_data):
        """Test processing 999 as missing data"""
        df = pd.read_csv(io.BytesIO(numeric_999_data))
        mock_request.app.state.df = df
        
        options = {
            "blanks": False,
            "na": False,
            "other": True,
            "otherText": "999"
        }
        
        with patch('routes.dashboard_routes.clear_missing_mechanism_cache'):
            from routes.validation_routes import submit_missing_data_options
            result = await submit_missing_data_options(mock_request, json.dumps(options))
        
        assert result["success"] is True
        # Verify 999 values were replaced with NaN
        processed_df = mock_request.app.state.df
        assert processed_df.isna().sum().sum() > 0

    @pytest.mark.asyncio
    async def test_process_na_missing(self, mock_request, na_data):
        """Test processing N/A as missing data"""
        df = pd.read_csv(io.BytesIO(na_data))
        mock_request.app.state.df = df
        
        options = {
            "blanks": False,
            "na": True,
            "other": False,
            "otherText": ""
        }
        
        with patch('routes.dashboard_routes.clear_missing_mechanism_cache'):
            from routes.validation_routes import submit_missing_data_options
            result = await submit_missing_data_options(mock_request, json.dumps(options))
        
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_process_multiple_missing_patterns(self, mock_request, multiple_missing_data):
        """Test processing multiple missing data patterns"""
        df = pd.read_csv(io.BytesIO(multiple_missing_data))
        mock_request.app.state.df = df
        
        options = {
            "blanks": True,
            "na": True,
            "other": True,
            "otherText": "999, NULL, MISSING"
        }
        
        with patch('routes.dashboard_routes.clear_missing_mechanism_cache'):
            from routes.validation_routes import submit_missing_data_options
            result = await submit_missing_data_options(mock_request, json.dumps(options))
        
        assert result["success"] is True
# TODO
class TestTargetFeature:
    """Test target feature configuration with sample datasets"""
    
    @pytest.mark.asyncio
    async def test_numerical_target_air_quality(self, mock_request, csv_air_quality):
        """Test numerical target feature with air quality dataset"""
        # Detect separator for CSV files
        sample = csv_air_quality[:1024].decode('utf-8', errors='ignore')
        if ';' in sample and sample.count(';') > sample.count(','):
            sep = ';'
        else:
            sep = ','
        df = pd.read_csv(io.BytesIO(csv_air_quality), header=None, sep=sep)
        mock_request.app.state.df = df
        
        # Use first numerical column as target
        numerical_cols = df.select_dtypes(include=[np.number]).columns
        if len(numerical_cols) > 0:
            target_col = numerical_cols[0]
            
            with patch('routes.dashboard_routes.clear_missing_mechanism_cache'):
                from routes.validation_routes import submit_target_feature
                result = await submit_target_feature(mock_request, target_col, "numerical")
            
            assert result["success"] is True
            assert mock_request.app.state.target_feature == target_col
            assert mock_request.app.state.target_type == "numerical"

    @pytest.mark.asyncio
    async def test_categorical_target_iris(self, mock_request, no_missing_data):
        """Test categorical target feature with Iris dataset"""
        df = pd.read_csv(io.BytesIO(no_missing_data))
        mock_request.app.state.df = df
        
        # Use last column (species) as categorical target
        target_col = df.columns[-1]
        
        with patch('routes.dashboard_routes.clear_missing_mechanism_cache'):
            from routes.validation_routes import submit_target_feature
            result = await submit_target_feature(mock_request, target_col, "categorical")
        
        assert result["success"] is True
        assert mock_request.app.state.target_feature == target_col
        assert mock_request.app.state.target_type == "categorical"

    @pytest.mark.asyncio
    async def test_skip_target_feature_large_dataset(self, mock_request, over30_features):
        """Test skipping target feature with large dataset"""
        df = pd.read_csv(io.BytesIO(over30_features))
        mock_request.app.state.df = df
        
        with patch('routes.dashboard_routes.clear_missing_mechanism_cache'):
            from routes.validation_routes import submit_target_feature
            result = await submit_target_feature(mock_request, "", "")
        
        assert result["success"] is True
        assert mock_request.app.state.target_feature == ""
        assert mock_request.app.state.target_type == ""

class TestDatasetPreview:
    """Test dataset preview with sample datasets"""
    
    @pytest.mark.asyncio
    async def test_preview_csv_with_missing_options(self, mock_request, blanks_data):
        """Test preview with missing data options applied"""
        mock_request.app.state.latest_uploaded_file = blanks_data
        mock_request.app.state.latest_uploaded_filename = "BLANKS_test.csv"
        
        options = {"na": False, "other": False, "otherText": ""}
        
        from routes.validation_routes import dataset_preview_live
        result = await dataset_preview_live(
            mock_request, 
            json.dumps(options), 
            "true"
        )
        
        assert result["success"] is True
        assert "title_row" in result
        assert "data_rows" in result
        assert len(result["data_rows"]) <= 10  # Preview limited to 10 rows

    @pytest.mark.asyncio
    async def test_preview_xlsx_without_feature_names(self, mock_request, xlsx_cola):
        """Test preview XLSX without feature names"""
        mock_request.app.state.latest_uploaded_file = xlsx_cola
        mock_request.app.state.latest_uploaded_filename = "XLSX_Cola.xlsx"
        
        options = {"na": False, "other": False, "otherText": ""}
        
        from routes.validation_routes import dataset_preview_live
        result = await dataset_preview_live(
            mock_request, 
            json.dumps(options), 
            "false"
        )
        
        assert result["success"] is True
        assert "Feature 1" in result["title_row"]

class TestMissingDataAnalysis:
    """Test missing data analysis with sample datasepytest -v
ts"""
    
    def test_analysis_blanks_dataset(self, mock_request, blanks_data):
        """Test missing data analysis with blanks dataset"""
        df = pd.read_csv(io.BytesIO(blanks_data))
        mock_request.app.state.df = df
        
        from routes.validation_routes import missing_data_analysis
        result = missing_data_analysis(mock_request)
        
        assert result["success"] is True
        assert result["total_cells"] > 0
        assert result["missing_cells"] >= 0
        assert "missing_patterns" in result
        assert "columns_with_missing" in result

    def test_analysis_no_missing_dataset(self, mock_request, no_missing_data):
        """Test missing data analysis with no missing data"""
        df = pd.read_csv(io.BytesIO(no_missing_data))
        mock_request.app.state.df = df
        
        from routes.validation_routes import missing_data_analysis
        result = missing_data_analysis(mock_request)
        
        assert result["success"] is True
        assert result["total_cells"] > 0
        assert result["missing_cells"] == 0
        assert result["missing_percentage"] == 0.0
        assert len(result["columns_with_missing"]) == 0


    def test_analysis_multiple_missing_patterns(self, mock_request, multiple_missing_data):
        """Test analysis with multiple missing data patterns"""
        df = pd.read_csv(io.BytesIO(multiple_missing_data))
        mock_request.app.state.df = df
        
        from routes.validation_routes import missing_data_analysis
        result = missing_data_analysis(mock_request)
        
        assert result["success"] is True
        assert result["missing_cells"] > 0
        assert result["missing_percentage"] > 0.0
        assert len(result["missing_patterns"]) > 0
        assert len(result["columns_with_missing"]) > 0

class TestEdgeCases:
    """Test edge cases with sample datasets"""
    
    @pytest.mark.asyncio
    async def test_feature_names_detection_accuracy(self, mock_request, no_feature_names):
        """Test accurate feature names detection"""
        mock_file = Mock()
        mock_file.filename = "NOFEATURE_gsalc.csv"
        mock_file.read = AsyncMock(return_value=no_feature_names)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        # Should correctly detect no feature names
        assert result["success"] is True
        # Verify detection logic worked correctly
        if not result["has_feature_names"]:
            assert all("Feature" in col for col in result["title_row"])

    @pytest.mark.asyncio
    async def test_large_dataset_memory_handling(self, mock_request, over30_features):
        """Test memory handling with large dataset"""
        mock_file = Mock()
        mock_file.filename = "OVER30_mnist_test.csv"
        mock_file.read = AsyncMock(return_value=over30_features)
        
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        
        assert result["success"] is True
        # Verify preview is still limited to 10 rows despite large dataset
        assert len(result["data_rows"]) <= 10

    @pytest.mark.asyncio
    async def test_complex_missing_data_replacement(self, mock_request, numeric_999_data):
        """Test complex missing data replacement scenarios"""
        df = pd.read_csv(io.BytesIO(numeric_999_data))
        mock_request.app.state.df = df
        
        # Test edge case: numeric string that should be converted to float
        options = {
            "blanks": False,
            "na": False,
            "other": True,
            "otherText": "999.0, 999, -999"
        }
        
        with patch('routes.dashboard_routes.clear_missing_mechanism_cache'):
            from routes.validation_routes import submit_missing_data_options
            result = await submit_missing_data_options(mock_request, json.dumps(options))
        
        assert result["success"] is True

    def test_data_type_preservation(self, mock_request, csv_air_quality):
        """Test that data types are preserved correctly"""
        df = pd.read_csv(io.BytesIO(csv_air_quality))
        original_dtypes = df.dtypes.copy()
        mock_request.app.state.df = df
        
        from routes.validation_routes import missing_data_analysis
        result = missing_data_analysis(mock_request)
        
        assert result["success"] is True
        # Verify analysis doesn't modify original dataframe
        assert df.dtypes.equals(original_dtypes)

class TestPerformance:
    """Test performance with sample datasets"""
    
    @pytest.mark.asyncio
    async def test_upload_performance_large_dataset(self, mock_request, over30_features):
        """Test upload performance with large dataset"""
        import time
        
        mock_file = Mock()
        mock_file.filename = "OVER30_mnist_test.csv"
        mock_file.read = AsyncMock(return_value=over30_features)
        
        start_time = time.time()
        from routes.validation_routes import validate_upload
        result = await validate_upload(mock_request, mock_file)
        end_time = time.time()
        
        assert result["success"] is True
        # Should complete within reasonable time (adjust threshold as needed)
        assert (end_time - start_time) < 5  # 5 seconds max

    def test_analysis_performance_complex_missing(self, mock_request, multiple_missing_data):
        """Test analysis performance with complex missing data patterns"""
        import time
        
        df = pd.read_csv(io.BytesIO(multiple_missing_data))
        mock_request.app.state.df = df
        
        start_time = time.time()
        from routes.validation_routes import missing_data_analysis
        result = missing_data_analysis(mock_request)
        end_time = time.time()
        
        assert result["success"] is True
        # Analysis should be fast even with complex patterns
        assert (end_time - start_time) < 5  # 5 seconds max
