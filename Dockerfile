FROM python:3.11-slim

WORKDIR /code

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

    # Install system dependencies for SSL
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy requirements from the root of the repository (requires Build Context: .)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the app folder from the root
COPY app ./app

# Copy and setup the startup script
COPY start.sh .
RUN chmod +x start.sh
RUN chown -R appuser:appgroup /code

EXPOSE 8000

USER appuser

CMD ["./start.sh"]