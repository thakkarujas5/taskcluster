FROM node:22.13.1-bookworm
RUN apt-get update && apt-get install -y \
    rabbitmq-server && \
    rm -rf /var/lib/apt/lists/*

# Set a default command useful for debugging
CMD ["/bin/bash", "--login"]
