FROM python:3.11-slim

WORKDIR /code

    # Install system dependencies for SSL
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy requirements from the root of the repository (requires Build Context: .)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the app folder from the root
COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.__init__:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]