FROM debian:bookworm-slim

ENV NVM_DIR=/usr/local/nvm
ENV NODE_VERSION=20
ENV PATH="$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH"

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    git \
    build-essential \
    pkg-config \
    g++ \
    nano \
    tree \
    procps \
    ffmpeg \
    cmake \
    wget \
    unzip \
    mediainfo \
    zlib1g-dev \
    bash-completion \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p $NVM_DIR && curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash

RUN . "$NVM_DIR/nvm.sh" && \
    nvm install $NODE_VERSION && \
    nvm use $NODE_VERSION && \
    nvm alias default $NODE_VERSION

RUN echo 'export NVM_DIR="/usr/local/nvm"' >> /etc/bash.bashrc && \
    echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> /etc/bash.bashrc

RUN echo "alias ll='ls -lahS'" >> /etc/bash.bashrc

RUN cd /tmp && \
    curl -kL https://www.bok.net/Bento4/binaries/Bento4-SDK-1-6-0-641.x86_64-unknown-linux.zip -o bento4.zip && \
    unzip -j bento4.zip 'Bento4-SDK-1-6-0-641.x86_64-unknown-linux/bin/*' -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/mp4* && \
    rm -f bento4.zip

RUN git clone https://github.com/gpac/gpac.git /tmp/gpac && \
    cd /tmp/gpac && \
    ./configure --static-mp4box --use-zlib=no && \
    make -j$(nproc) && \
    make install && \
    rm -rf /tmp/gpac

WORKDIR /app

EXPOSE 3000
