import os, tempfile
os.environ["GENEWEAVER_DB"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "t.db")
os.environ["GENEWEAVER_SECRET"] = "test-secret-test-secret-test-secret"
