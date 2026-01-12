import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from fastapi import FastAPI
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.dashboard_routes import router
from models.feature import Feature, FEATURE_CACHE

# Create test app
app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TestGetUploadedDataframe:
    """Test get_uploaded_dataframe helper function."""
    
    def test_get_uploaded_dataframe_success(self):
        """Test get_uploaded_dataframe with valid data."""
        from routes.dashboard_routes import get_uploaded_dataframe
        
        mock_request = Mock()
        test_df = pd.DataFrame({'col1': [1, 2, 3]})
        mock_request.app.state.df = test_df
        
        df, error = get_uploaded_dataframe(mock_request)
        
        assert df is not None
        assert error is None
        assert df.equals(test_df)
    
    def test_get_uploaded_dataframe_no_data(self):
        """Test get_uploaded_dataframe with no data."""
        from routes.dashboard_routes import get_uploaded_dataframe
        
        mock_request = Mock()
        mock_request.app.state.df = None
        
        df, error = get_uploaded_dataframe(mock_request)
        
        assert df is None
        assert error is not None
        assert error.status_code == 400
    
    def test_get_uploaded_dataframe_empty_data(self):
        """Test get_uploaded_dataframe with empty dataframe."""
        from routes.dashboard_routes import get_uploaded_dataframe
        
        mock_request = Mock()
        mock_request.app.state.df = pd.DataFrame()
        
        df, error = get_uploaded_dataframe(mock_request)
        
        assert df is None
        assert error is not None
        assert error.status_code == 400


class TestDashboardRoutes:
    """Test dashboard routes functionality."""
    
    def setup_method(self):
        """Clear cache and setup test data before each test."""
        FEATURE_CACHE.clear()
        
        # Create test dataframe
        self.test_df = pd.DataFrame({
            'high_missing': [1, 2, np.nan, np.nan, np.nan, 6, 7, 8, 9, 10],  # 30% missing
            'medium_missing': [1, np.nan, 3, 4, 5, 6, 7, 8, 9, 10],  # 10% missing
            'complete_numeric': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],  # 0% missing
            'complete_categorical': ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'A', 'B']  # 0% missing
        })
    
    def test_case_count_success(self):
        """Test case count endpoint with valid data."""
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.get("/api/case-count")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["total_missing_cases"] == 4  
            assert data["missing_percentage"] == 40.0
    
    def test_case_count_no_missing(self):
        """Test case count with no missing data."""
        complete_df = pd.DataFrame({
            'col1': [1, 2, 3, 4, 5],
            'col2': [6, 7, 8, 9, 10]
        })
        
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (complete_df, None)
            
            response = client.get("/api/case-count")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["total_missing_cases"] == 0
            assert data["missing_percentage"] == 0.0
    
    def test_case_count_no_data(self):
        """Test case count with no data available."""
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            from fastapi.responses import JSONResponse
            mock_error = JSONResponse(status_code=400, content={"success": False, "message": "No data"})
            mock_get_df.return_value = (None, mock_error)
            
            response = client.get("/api/case-count")
            
            assert response.status_code == 400
    
    def test_feature_count_success(self):
        """Test feature count endpoint with valid data."""
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.get("/api/feature-count")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["features_with_missing"] == 2  # high_missing and medium_missing
            assert data["missing_feature_percentage"] == 50.0  # 2 out of 4 features
    
    def test_feature_count_no_missing(self):
        """Test feature count with no missing features."""
        complete_df = pd.DataFrame({
            'col1': [1, 2, 3, 4, 5],
            'col2': [6, 7, 8, 9, 10]
        })
        
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (complete_df, None)
            
            response = client.get("/api/feature-count")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["features_with_missing"] == 0
            assert data["missing_feature_percentage"] == 0.0


    # TODO noone case
    
    def test_missing_mechanism_success(self):
        """Test missing mechanism endpoint with valid mechanism."""
        mock_mechanism = {
            "success": True,
            "mechanism_acronym": "MCAR",
            "mechanism_full": "(Missing Completely at Random)",
            "p_value": 0.8,
            "confidence": "high"
        }
        
        with patch('routes.dashboard_routes.get_cached_missing_mechanism') as mock_get_mech:
            mock_get_mech.return_value = mock_mechanism
            
            response = client.get("/api/missing-mechanism")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["mechanism_acronym"] == "MCAR"
            assert data["p_value"] == 0.8
    
    def test_missing_mechanism_error(self):
        """Test missing mechanism endpoint with error."""
        mock_mechanism = {
            "success": False,
            "message": "Dataset too small",
            "error_type": "insufficient_data"
        }
        
        with patch('routes.dashboard_routes.get_cached_missing_mechanism') as mock_get_mech:
            mock_get_mech.return_value = mock_mechanism
            
            response = client.get("/api/missing-mechanism")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is False
            assert "too small" in data["message"]
    
    def test_missing_mechanism_no_data(self):
        """Test missing mechanism endpoint with no data."""
        with patch('routes.dashboard_routes.get_cached_missing_mechanism') as mock_get_mech:
            mock_get_mech.return_value = None
            
            response = client.get("/api/missing-mechanism")
            
            assert response.status_code == 400
    

    @patch('routes.dashboard_routes.calculate_all_recommendations')
    @patch('routes.dashboard_routes.group_recommendations_by_type')
    def test_recommendations_success(self, mock_group, mock_calc):
        """Test recommendations endpoint with valid data."""
        mock_recommendations = {
            "feature1": {"recommendation_type": "Remove Features", "reason": "Test reason"},
            "feature2": {"recommendation_type": "Missing-indicator method", "reason": "Test reason"}
        }
        mock_grouped = [
            {"recommendation_type": "Remove Features", "features": ["feature1"]},
            {"recommendation_type": "Missing-indicator method", "features": ["feature2"]}
        ]
        
        mock_calc.return_value = mock_recommendations
        mock_group.return_value = mock_grouped
        
        # Mock FEATURE_CACHE to not be empty
        with patch.dict('models.feature.FEATURE_CACHE', {'feature1': Mock(), 'feature2': Mock()}):
            with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
                mock_get_df.return_value = (self.test_df, None)
                
                with patch('routes.dashboard_routes.initialize_feature_cache'):
                    with patch('routes.dashboard_routes.get_cached_missing_mechanism') as mock_mech:
                        mock_mech.return_value = {"success": True, "mechanism_acronym": "MCAR"}
                        
                        response = client.get("/api/missing-data-recommendations")
                        
                        assert response.status_code == 200
                        data = response.json()
                        
                        assert data["success"] is True
                        assert len(data["recommendations"]) == 2
                        assert data["metadata"]["dataset_mechanism"] == "MCAR"

    def test_recommendations_no_missing_data(self):
        """Test recommendations with no missing data."""
        complete_df = pd.DataFrame({
            'col1': [1, 2, 3, 4, 5],
            'col2': [6, 7, 8, 9, 10]
        })
        
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (complete_df, None)
            
            response = client.get("/api/missing-data-recommendations")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert len(data["recommendations"]) == 0
            assert "No features with missing data" in data["message"]
    
    def test_recommendations_cache_initialization_error(self):
        """Test recommendations with cache initialization error."""
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            with patch('routes.dashboard_routes.initialize_feature_cache') as mock_init:
                mock_init.side_effect = Exception("Cache error")
                
                response = client.get("/api/missing-data-recommendations")
                
                assert response.status_code == 500
                data = response.json()
                
                assert data["success"] is False
                assert "Failed to analyze dataset features" in data["message"]


class TestMissingMechanismCaching:
    """Test missing mechanism caching functionality."""

    def setup_method(self):
        """Setup test data."""
        # Create larger dataset (30+ rows) to meet minimum requirement
        self.test_df = pd.DataFrame({
            'col1': list(range(1, 31)) + [np.nan] * 5,
            'col2': [1] * 15 + [np.nan] * 5 + list(range(16, 31))
        })
        
        # Create a proper mock request with state object
        self.mock_request = Mock()
        self.mock_request.app = Mock()
        self.mock_request.app.state = Mock()
        delattr(self.mock_request.app.state, 'missing_data_mechanism') if hasattr(self.mock_request.app.state, 'missing_data_mechanism') else None

    

    
    @patch('routes.dashboard_routes.MCARTest')
    def test_mechanism_calculation_success(self, mock_mcar):
        """Test successful mechanism calculation."""
        mock_test = Mock()
        mock_test.little_mcar_test.return_value = 0.8
        mock_mcar.return_value = mock_test
        
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            from routes.dashboard_routes import get_cached_missing_mechanism
            result = get_cached_missing_mechanism(self.mock_request)
            
            assert result["success"] is True
            assert result["mechanism_acronym"] == "MCAR"
            assert result["p_value"] == 0.8
    
    @patch('routes.dashboard_routes.MCARTest')
    def test_mechanism_calculation_mar(self, mock_mcar):
        """Test MAR mechanism detection."""
        mock_test = Mock()
        mock_test.little_mcar_test.return_value = 0.01  # p < 0.05
        mock_mcar.return_value = mock_test
        
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            from routes.dashboard_routes import get_cached_missing_mechanism
            result = get_cached_missing_mechanism(self.mock_request)
            
            assert result["success"] is True
            assert result["mechanism_acronym"] == "MAR or MNAR"
            assert result["p_value"] == 0.01
    
    def test_mechanism_no_missing_data(self):
        """Test mechanism with no missing data."""
        complete_df = pd.DataFrame({
            'col1': [1, 2, 3, 4, 5],
            'col2': [6, 7, 8, 9, 10]
        })
        
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (complete_df, None)
            
            from routes.dashboard_routes import get_cached_missing_mechanism
            result = get_cached_missing_mechanism(self.mock_request)
            
            assert result["success"] is False
            assert result["error_type"] == "no_missing_data"
    
    def test_mechanism_insufficient_data(self):
        """Test mechanism with insufficient data."""
        small_df = pd.DataFrame({
            'col1': [1, np.nan, 3],  # Only 3 rows
            'col2': [1, 2, np.nan]
        })
        
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (small_df, None)
            
            from routes.dashboard_routes import get_cached_missing_mechanism
            result = get_cached_missing_mechanism(self.mock_request)
            
            assert result["success"] is False
            assert result["error_type"] == "insufficient_data"


    @patch('routes.dashboard_routes.MCARTest')
    def test_mechanism_test_error(self, mock_mcar):
        """Test mechanism calculation with test error."""
        mock_test = Mock()
        mock_test.little_mcar_test.side_effect = ValueError("Test error") # TODO: look up side_effect use
        mock_mcar.return_value = mock_test
        
        # Use larger dataset to bypass insufficient_data check
        large_df = pd.DataFrame({
            'col1': list(range(1, 31)) + [np.nan] * 5,
            'col2': [1] * 15 + [np.nan] * 5 + list(range(16, 31))
        })
        
        with patch('routes.dashboard_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (large_df, None)
            
            from routes.dashboard_routes import get_cached_missing_mechanism
            result = get_cached_missing_mechanism(self.mock_request)
            
            assert result["success"] is False
            assert result["error_type"] == "data_format_error"


    def test_mechanism_caching(self):
        """Test that mechanism results are cached."""
        cached_result = {
            "success": True,
            "mechanism_acronym": "MCAR",
            "p_value": 0.8
        }
        
        # Set cached result
        self.mock_request.app.state.missing_data_mechanism = cached_result
        
        from routes.dashboard_routes import get_cached_missing_mechanism
        result = get_cached_missing_mechanism(self.mock_request)
        
        assert result == cached_result
    
    def test_clear_mechanism_cache(self):
        """Test clearing mechanism cache."""
        self.mock_request.app.state.missing_data_mechanism = {"test": "data"}
        
        from routes.dashboard_routes import clear_missing_mechanism_cache
        clear_missing_mechanism_cache(self.mock_request)
        
        assert not hasattr(self.mock_request.app.state, "missing_data_mechanism")




if __name__ == "__main__":
    pytest.main([__file__])