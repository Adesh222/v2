import sys
import os

# Ensure the backend directory is on the Python path so imports work when pytest runs from the project root.
# This is needed because test_suite.py lives in the backend root.
backend_path = os.path.abspath(os.path.dirname(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from test_suite import run_tests

def test_full():
    """Execute the full MediQueue QA test suite as a pytest test.
    The original test_suite.py contains a ``run_tests`` function that prints output
    and asserts internally. By calling it here, we integrate the existing logic
    into pytest's discovery.
    """
    run_tests()
