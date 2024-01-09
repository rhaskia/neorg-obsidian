# Use a base image with a Linux environment
FROM ubuntu:20.04

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    python3 \
    nodejs \
    npm

# Clone Emscripten repository
RUN git clone https://github.com/emscripten-core/emsdk.git /emsdk

# Set the working directory
WORKDIR /emsdk

# Download and install Emscripten
RUN ./emsdk install latest
RUN ./emsdk activate latest
RUN echo "source /emsdk/emsdk_env.sh" >> /root/.bashrc

# Set the default command to run when the container starts
CMD ["/bin/bash"]

