"""Testes unitários — funções puras de analytics.py, sem tocar no banco."""

import datetime

import numpy as np
import pandas as pd

import analytics


class TestNative:
    def test_numpy_int_becomes_python_int(self):
        result = analytics._native(np.int64(42))
        assert result == 42
        assert isinstance(result, int)

    def test_numpy_float_becomes_python_float(self):
        result = analytics._native(np.float64(3.14))
        assert result == 3.14
        assert isinstance(result, float)

    def test_nan_becomes_none(self):
        assert analytics._native(np.float64("nan")) is None
        assert analytics._native(float("nan")) is None

    def test_none_stays_none(self):
        assert analytics._native(None) is None

    def test_timestamp_becomes_iso_string(self):
        ts = pd.Timestamp("2018-06-15")
        assert analytics._native(ts) == "2018-06-15"

    def test_date_becomes_iso_string(self):
        d = datetime.date(2018, 6, 15)
        assert analytics._native(d) == "2018-06-15"

    def test_plain_values_pass_through(self):
        assert analytics._native("SP") == "SP"
        assert analytics._native(42) == 42
        assert analytics._native(3.5) == 3.5


class TestToRecords:
    def test_converts_dataframe_to_list_of_dicts(self):
        df = pd.DataFrame({"state": ["SP", "RJ"], "revenue": [np.float64(100.0), np.float64(200.0)]})
        records = analytics.to_records(df)
        assert records == [{"state": "SP", "revenue": 100.0}, {"state": "RJ", "revenue": 200.0}]

    def test_empty_dataframe_returns_empty_list(self):
        df = pd.DataFrame({"state": [], "revenue": []})
        assert analytics.to_records(df) == []

    def test_nan_values_become_none_in_records(self):
        df = pd.DataFrame({"score": [1.0, np.nan]})
        records = analytics.to_records(df)
        assert records[0]["score"] == 1.0
        assert records[1]["score"] is None


class TestFilterClauses:
    def test_no_filters_returns_empty_clause(self):
        where, params = analytics._filter_clauses([], [], "c.state", "category_expr")
        assert where == ""
        assert params == {}

    def test_states_only(self):
        where, params = analytics._filter_clauses(["SP", "RJ"], [], "c.state", "category_expr")
        assert "c.state IN :states" in where
        assert params == {"states": ("SP", "RJ")}

    def test_categories_only(self):
        where, params = analytics._filter_clauses([], ["health_beauty"], "c.state", "category_expr")
        assert "category_expr IN :categories" in where
        assert params == {"categories": ("health_beauty",)}

    def test_states_and_categories_combined_with_and(self):
        where, params = analytics._filter_clauses(["SP"], ["health_beauty"], "c.state", "category_expr")
        assert "c.state IN :states" in where
        assert "category_expr IN :categories" in where
        assert " AND " in where.strip()
        assert params == {"states": ("SP",), "categories": ("health_beauty",)}

    def test_start_date_only(self):
        where, params = analytics._filter_clauses([], [], "c.state", "category_expr", start_date="2018-01-01")
        assert "o.purchase_ts >= :start_date" in where
        assert params["start_date"] == "2018-01-01"

    def test_end_date_is_inclusive_via_next_day(self):
        where, params = analytics._filter_clauses([], [], "c.state", "category_expr", end_date="2018-01-31")
        assert "DATE_ADD(:end_date, INTERVAL 1 DAY)" in where
        assert params["end_date"] == "2018-01-31"

    def test_custom_date_column(self):
        where, _ = analytics._filter_clauses(
            [], [], "c.state", "category_expr", start_date="2018-01-01", date_col="se.event_date"
        )
        assert "se.event_date >= :start_date" in where


class TestPctChange:
    def test_positive_change(self):
        assert analytics._pct_change(120, 100) == 20.0

    def test_negative_change(self):
        assert analytics._pct_change(80, 100) == -20.0

    def test_zero_previous_returns_none(self):
        assert analytics._pct_change(50, 0) is None

    def test_rounds_to_one_decimal(self):
        assert analytics._pct_change(110.5, 100) == 10.5
