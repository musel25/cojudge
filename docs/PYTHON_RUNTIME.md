# Python runtime image

Set `COJUDGE_PYTHON_IMAGE` to a locally available Docker image to add Python libraries.
The judge, playground, and debugger use this image. The default is `python:3.11-slim`.
Build or pull the image before starting Cojudge. Restart Cojudge after changing the variable.
The image must provide Python 3.11 and a POSIX shell.

The Pybites FastAPI course supplies a locked runtime in
`capital-one-prep/cojudge/fastapi_path`. Build its Dockerfile, then set
`COJUDGE_PYTHON_IMAGE=cojudge-python:fastapi`. Dependencies are installed when the
image is built. Exercises need no package downloads or external service.
