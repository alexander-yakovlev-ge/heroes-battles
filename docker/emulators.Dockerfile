# Firebase Emulator Suite (Auth, Firestore, Realtime Database, Storage)
FROM node:22-trixie-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-21-jre-headless curl \
  && rm -rf /var/lib/apt/lists/*

ARG FIREBASE_TOOLS_VERSION=15.32.1
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} \
  && firebase setup:emulators:firestore \
  && firebase setup:emulators:database \
  && firebase setup:emulators:storage

WORKDIR /app
COPY firebase.json firestore.rules firestore.indexes.json database.rules.json storage.rules ./

EXPOSE 8080 9000 9099 9199
CMD ["firebase", "emulators:start", "--project", "demo-heroes-battles"]
