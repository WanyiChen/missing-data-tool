import pytest
import pandas as pd
import numpy as np
from datetime import datetime
from unittest.mock import patch, MagicMock
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.feature import (
    Feature, FEATURE_CACHE, get_feature_from_cache, get_all_features_from_cache,
    initialize_feature_cache, calculate_eta, calculate_feature_correlations_with_thresholds,
    calculate_informative_missingness, adjust_reason_grammar, calculate_recommendation
)


class TestFeature:
    """Test the Feature class functionality."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    def test_feature_initialization(self):
        """Test Feature object creation."""
        feature = Feature("test_feature", "N", 10, 25.5, "float64")
        
        assert feature.name == "test_feature"
        assert feature.data_type == "N"
        assert feature.number_missing == 10
        assert feature.percentage_missing == 25.5
        assert feature.original_dtype == "float64"
        assert feature.correlated_features == []
        assert not feature.correlations_calculated
        assert not feature.informative_calculated
        assert feature.auto_detected_data_type == "N"
        assert not feature.is_data_type_manually_set
    
    def test_feature_data_type_setter(self):
        """Test data type setter validation and side effects."""
        feature = Feature("test", "N", 5, 10.0, "float64")  # Specify original_dtype
        FEATURE_CACHE["test"] = feature
        
        # Valid data type change
        feature.data_type = "C"
        assert feature.data_type == "C"
        assert feature.is_data_type_manually_set
        
        # Invalid data type
        with pytest.raises(ValueError):
            feature.data_type = "X"
    
    def test_feature_correlations(self):
        """Test correlation setting and clearing."""
        feature = Feature("test", "N", 5, 10.0)
        
        correlations = [{"feature_name": "other", "correlation_value": 0.8, "correlation_type": "r"}]
        feature.set_correlated_features(correlations)
        
        assert feature.correlations_calculated
        assert len(feature.correlated_features) == 1
        assert feature.correlated_features[0]["feature_name"] == "other"
        
        feature.clear_correlations()
        assert not feature.correlations_calculated
        assert feature.correlated_features == []
    
    def test_feature_to_dict(self):
        """Test feature serialization."""
        feature = Feature("test", "N", 5, 10.0, "float64")
        feature_dict = feature.to_dict()
        
        assert feature_dict["feature_name"] == "test"
        assert feature_dict["data_type"] == "N"
        assert feature_dict["number_missing"] == 5
        assert feature_dict["percentage_missing"] == 10.0
        assert "last_updated" in feature_dict


class TestFeatureCache:
    """Test feature cache functionality."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    def test_initialize_feature_cache(self):
        """Test feature cache initialization with various data types."""
        # Create test dataframe with different data types and missing values
        df = pd.DataFrame({
            'numeric_col': [1.0, 2.0, np.nan, 4.0, 5.0],
            'categorical_col': ['A', 'B', None, 'A', 'B'],
            'complete_col': [1, 2, 3, 4, 5],
            'all_missing': [np.nan, np.nan, np.nan, np.nan, np.nan]
        })
        
        initialize_feature_cache(df)
        
        assert len(FEATURE_CACHE) == 4
        
        # Test numeric column
        numeric_feature = FEATURE_CACHE['numeric_col']
        assert numeric_feature.data_type == "N"
        assert numeric_feature.number_missing == 1
        assert numeric_feature.percentage_missing == 20.0
        
        # Test categorical column
        cat_feature = FEATURE_CACHE['categorical_col']
        assert cat_feature.data_type == "C"
        assert cat_feature.number_missing == 1
        
        # Test complete column
        complete_feature = FEATURE_CACHE['complete_col']
        assert complete_feature.number_missing == 0
        assert complete_feature.percentage_missing == 0.0
        
        # Test all missing column
        all_missing_feature = FEATURE_CACHE['all_missing']
        assert all_missing_feature.number_missing == 5
        assert all_missing_feature.percentage_missing == 100.0
    
    def test_initialize_feature_cache_empty_df(self):
        """Test cache initialization with empty dataframe."""
        df = pd.DataFrame()
        
        with pytest.raises(ValueError):
            initialize_feature_cache(df)
    
    def test_get_feature_from_cache(self):
        """Test retrieving features from cache."""
        feature = Feature("test", "N", 5, 10.0)
        FEATURE_CACHE["test"] = feature
        
        retrieved = get_feature_from_cache("test")
        assert retrieved is feature
        
        not_found = get_feature_from_cache("nonexistent")
        assert not_found is None
    
    def test_get_all_features_from_cache(self):
        """Test retrieving all features sorted by missing percentage."""
        feature1 = Feature("low_missing", "N", 1, 5.0)
        feature2 = Feature("high_missing", "N", 10, 50.0)
        feature3 = Feature("medium_missing", "N", 5, 25.0)
        
        FEATURE_CACHE["low_missing"] = feature1
        FEATURE_CACHE["high_missing"] = feature2
        FEATURE_CACHE["medium_missing"] = feature3
        
        all_features = get_all_features_from_cache()
        
        assert len(all_features) == 3
        # Should be sorted by percentage missing (descending)
        assert all_features[0].name == "high_missing"
        assert all_features[1].name == "medium_missing"
        assert all_features[2].name == "low_missing"


class TestCorrelationCalculations:
    """Test correlation calculation functions."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    def test_calculate_eta(self):
        """Test eta calculation for categorical-numerical correlation."""
        # Create test data
        categorical = pd.Series(['A', 'A', 'B', 'B', 'C', 'C'] * 5)
        numerical = pd.Series([1, 2, 10, 11, 20, 21] * 5)
        
        eta, p_value = calculate_eta(categorical, numerical)
        
        assert eta is not None
        assert 0 <= eta <= 1
        assert p_value is not None
    
    def test_calculate_eta_insufficient_data(self):
        """Test eta calculation with insufficient data."""
        categorical = pd.Series(['A', 'A'])
        numerical = pd.Series([1, 2])
        
        eta, p_value = calculate_eta(categorical, numerical)
        
        assert eta is None
        assert p_value is None
    
    def test_calculate_feature_correlations_with_thresholds(self):
        """Test correlation calculation with different thresholds."""
        # Create test dataframe with correlated features
        df = pd.DataFrame({
            'num1': [1, 2, 3, 4, 5, np.nan, 7, 8, 9, 10, 11, 12],
            'num2': [2, 4, 6, 8, 10, np.nan, 14, 16, 18, 20, 22, 24],  # Highly correlated with num1
            'cat1': ['A', 'A', 'B', 'B', 'C', 'C', 'A', 'A', 'B', 'B', 'C', 'C'],
            'cat2': ['X', 'X', 'Y', 'Y', 'Z', 'Z', 'X', 'X', 'Y', 'Y', 'Z', 'Z']  # Correlated with cat1
        })
        
        # Initialize cache
        initialize_feature_cache(df)
        
        # Test numerical-numerical correlation (Pearson)
        correlations = calculate_feature_correlations_with_thresholds(
            df, 'num1', pearson_threshold=0.5
        )
        
        # Should find correlation with num2
        assert len(correlations) > 0
        num2_corr = next((c for c in correlations if c['feature_name'] == 'num2'), None)
        assert num2_corr is not None
        assert num2_corr['correlation_type'] == 'r'
        assert abs(num2_corr['correlation_value']) >= 0.5
    
    def test_calculate_feature_correlations_nonexistent_feature(self):
        """Test correlation calculation for nonexistent feature."""
        df = pd.DataFrame({'col1': [1, 2, 3]})
        
        correlations = calculate_feature_correlations_with_thresholds(df, 'nonexistent')
        assert correlations == []


class TestInformativeMissingness:
    """Test informative missingness calculation."""
    
    def test_calculate_informative_missingness(self):
        """Test informative missingness calculation (placeholder)."""
        df = pd.DataFrame({'col1': [1, 2, np.nan, 4, 5]})
        
        result = calculate_informative_missingness(df, 'col1')
        
        assert isinstance(result, dict)
        assert 'is_informative' in result
        assert 'p_value' in result
        # Currently returns placeholder values
        assert result['is_informative'] is False
        assert result['p_value'] == 1.0


class TestRecommendationEngine:
    """Test recommendation calculation logic."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    def test_calculate_recommendation_informative_missingness(self):
        """Test recommendation for feature with informative missingness."""
        feature = Feature("test", "N", 10, 25.0)
        feature.set_informative_missingness({"is_informative": True, "p_value": 0.01})
        
        recommendation = calculate_recommendation(feature)
        
        assert recommendation is not None
        assert recommendation["recommendation_type"] == "Missing-indicator method"
        assert recommendation["rule_applied"] == 1
    
    def test_calculate_recommendation_strong_correlation(self):
        """Test recommendation for strongly correlated feature."""
        feature = Feature("test", "N", 10, 25.0)
        feature.set_informative_missingness({"is_informative": False, "p_value": 0.5})
        correlations = [{"feature_name": "other", "correlation_value": 0.8, "correlation_type": "r"}]
        feature.set_correlated_features(correlations)
        
        recommendation = calculate_recommendation(feature)
        
        assert recommendation is not None
        assert recommendation["recommendation_type"] == "Remove Features"
        assert recommendation["rule_applied"] == 2
    
    def test_calculate_recommendation_categorical(self):
        """Test recommendation for categorical feature."""
        feature = Feature("test", "C", 10, 25.0)
        feature.set_informative_missingness({"is_informative": False, "p_value": 0.5})
        feature.set_correlated_features([])  # No correlations
        
        recommendation = calculate_recommendation(feature)
        
        assert recommendation is not None
        assert "unknown" in recommendation["recommendation_type"].lower()
        assert recommendation["rule_applied"] == 3
    
    def test_calculate_recommendation_mar_mechanism(self):
        """Test recommendation for MAR dataset mechanism."""
        feature = Feature("test", "N", 10, 25.0)
        feature.set_informative_missingness({"is_informative": False, "p_value": 0.5})
        feature.set_correlated_features([])
        
        recommendation = calculate_recommendation(feature, "MAR")
        
        assert recommendation is not None
        assert "machine learning" in recommendation["recommendation_type"].lower()
        assert recommendation["rule_applied"] == 4
    
    def test_calculate_recommendation_mcar_mechanism(self):
        """Test recommendation for MCAR dataset mechanism."""
        feature = Feature("test", "N", 10, 25.0)
        feature.set_informative_missingness({"is_informative": False, "p_value": 0.5})
        feature.set_correlated_features([])
        
        recommendation = calculate_recommendation(feature, "MCAR")
        
        assert recommendation is not None
        assert "all methods are valid" in recommendation["recommendation_type"].lower()
        assert recommendation["rule_applied"] == 5
    
    def test_calculate_recommendation_fallback(self):
        """Test fallback recommendation."""
        feature = Feature("test", "N", 10, 25.0)
        feature.set_informative_missingness({"is_informative": False, "p_value": 0.5})
        feature.set_correlated_features([])
        
        recommendation = calculate_recommendation(feature, None)
        
        assert recommendation is not None
        assert "machine learning" in recommendation["recommendation_type"].lower()
        assert recommendation["rule_applied"] == 4


class TestGrammarAdjustment:
    """Test grammar adjustment for recommendations."""
    
    def test_adjust_reason_grammar_singular(self):
        """Test grammar adjustment for single feature."""
        plural_reason = "These features with missing data are strongly correlated with features with complete data."
        
        singular_reason = adjust_reason_grammar(plural_reason, 1)
        
        assert "This feature" in singular_reason
        assert "is strongly correlated" in singular_reason
        assert singular_reason.endswith('.')
    
    def test_adjust_reason_grammar_plural(self):
        """Test grammar adjustment for multiple features."""
        reason = "These features with missing data are strongly correlated"
        
        adjusted_reason = adjust_reason_grammar(reason, 3)
        
        assert adjusted_reason == reason + '.'  # Should just add period
    
    def test_adjust_reason_grammar_categorical(self):
        """Test grammar adjustment for categorical features."""
        plural_reason = "An 'unknown' category can replace missing data for categorical features."
        
        singular_reason = adjust_reason_grammar(plural_reason, 1)
        
        assert "this categorical feature" in singular_reason


class TestFeatureDataTypeDetection:
    """Test automatic data type detection."""
    
    def test_auto_detected_data_type_numeric(self):
        """Test auto-detection for numeric types."""
        feature_int = Feature("test", "N", 5, 10.0, "int64")
        feature_float = Feature("test", "N", 5, 10.0, "float64")
        
        assert feature_int.auto_detected_data_type == "N"
        assert feature_float.auto_detected_data_type == "N"
    
    def test_auto_detected_data_type_categorical(self):
        """Test auto-detection for categorical types."""
        feature_obj = Feature("test", "C", 5, 10.0, "object")
        feature_str = Feature("test", "C", 5, 10.0, "string")
        
        assert feature_obj.auto_detected_data_type == "C"
        assert feature_str.auto_detected_data_type == "C"
    
    def test_is_data_type_manually_set(self):
        """Test detection of manually set data types."""
        # Auto-detected as numeric, kept as numeric
        feature1 = Feature("test", "N", 5, 10.0, "float64")
        assert not feature1.is_data_type_manually_set
        
        # Auto-detected as numeric, changed to categorical
        feature2 = Feature("test", "C", 5, 10.0, "float64")
        assert feature2.is_data_type_manually_set
    
    def test_reset_to_auto_detected_type(self):
        """Test resetting to auto-detected type."""
        feature = Feature("test", "C", 5, 10.0, "float64")  # Manually set to categorical
        FEATURE_CACHE["test"] = feature
        
        assert feature.is_data_type_manually_set
        
        feature.reset_to_auto_detected_type()
        
        assert feature.data_type == "N"
        assert not feature.is_data_type_manually_set


class TestFeatureRecommendationCalculation:
    """Test feature recommendation calculation and caching."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    @patch('models.feature.calculate_recommendation')
    def test_calculate_and_set_recommendation(self, mock_calc_rec):
        """Test recommendation calculation and caching."""
        mock_calc_rec.return_value = {
            "recommendation_type": "Test recommendation",
            "reason": "Test reason",
            "rule_applied": 1
        }
        
        feature = Feature("test", "N", 10, 25.0)
        
        assert not feature.recommendation_calculated
        assert feature.needs_recommendation_recalculation()
        
        feature.calculate_and_set_recommendation("MCAR")
        
        assert feature.recommendation_calculated
        assert not feature.needs_recommendation_recalculation()
        assert feature.recommendation["recommendation_type"] == "Test recommendation"
        
        mock_calc_rec.assert_called_once_with(feature, "MCAR")
    
    @patch('models.feature.calculate_recommendation')
    def test_calculate_and_set_recommendation_error_handling(self, mock_calc_rec):
        """Test recommendation calculation error handling."""
        mock_calc_rec.side_effect = Exception("Test error")
        
        feature = Feature("test", "N", 10, 25.0)
        
        feature.calculate_and_set_recommendation()
        
        assert feature.recommendation_calculated
        assert "conservative fallback" in feature.recommendation["reason"]
        assert feature.recommendation["calculation_error"] is True


if __name__ == "__main__":
    pytest.main([__file__])