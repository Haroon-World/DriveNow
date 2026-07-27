import pymysql

pymysql.install_as_MySQLdb()

# Bypass Django's database version check for XAMPP (MariaDB 10.4)
try:
    from django.db.backends.base.base import BaseDatabaseWrapper
    BaseDatabaseWrapper.check_database_version_supported = lambda self: None
    
    # Also disable RETURNING clause which causes syntax errors in MariaDB 10.4
    from django.db.backends.mysql.features import DatabaseFeatures
    DatabaseFeatures.can_return_columns_from_insert = False
    DatabaseFeatures.can_return_rows_from_bulk_insert = False
except ImportError:
    pass