# TACTIX

## Description
TACTIX (Tactical Awareness and Communications Tracking for Incident eXchange) is a modular, containerized platform for tracking and sharing incident data in real time. The project provides a Minimum Viable Slice (MVS) that stitches together the core services required for ingest, authentication, incident tracking and collaborative presentation.

This repository contains a containerized skeleton for the core services:

- **gateway** – NGINX reverse proxy
- **auth-service** – OpenLDAP-backed authentication service issuing JWTs
- **incident-svc** – event‑sourced incident tracking
- **tak-ingest-svc** – Cursor-on-Target ingest pipeline
- **realtime-svc** – WebSocket gateway
- **warlog-svc** – operational war log service
- **eng-svc** – engineering chat (ENGNET)
- **ui** – placeholder web UI

## Quick Start (Dev)

### Prerequisites
- Docker
- Node 20
- pnpm (via corepack)

### Steps
```bash
corepack enable
pnpm -r install
docker compose up --build
```

### Health checks
```bash
curl http://localhost/health
curl http://localhost:3002/health
```

## Development Value

As of August 2025 the codebase contains roughly 3.3 KLOC of TypeScript and JavaScript. Applying the COCOMO model yields an estimated 8.5 person-months of effort, translating to approximately CAD $100k–$150k in development value. Factoring in its federated auth, realtime pipeline, and TAK ingest capabilities, a capability-equivalent rebuild would likely require CAD $200k–$450k.

## Getting Started

Install Docker and run:

```bash
docker-compose up --build
```

Each service exposes a basic `/health` endpoint.

## Development

Node packages use simple test scripts:

```bash
npm test
```

These are placeholders until real tests are added.

## Redis Streams Demo

The realtime service includes simple producer/consumer scripts demonstrating
Redis Streams usage. Example keys:

- `rt.incident.{id}` – incident-specific stream
- `rt.system.broadcast` – system-wide broadcast stream

Run the producer to append a message:

```bash
node services/realtime-svc/stream-producer.js rt.system.broadcast "hello"
```

Start the consumer to read and persist the last ID, allowing replay after
restart:

```bash
node services/realtime-svc/stream-consumer.js rt.system.broadcast
```

The consumer stores the last seen ID in a local file and resumes from that
point on subsequent runs.
=======
# TACTIX System Architecture
## Tactical Awareness and Communications Tracking for Incident eXchange

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TACTIX Platform Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│  Web UI (React)                │  Mobile App (React Native)     │
├─────────────────────────────────────────────────────────────────┤
│               API Gateway (Node.js + Express)                   │
├─────────────────────────────────────────────────────────────────┤
│ Auth Service │ Federation │ Radio Intel │ VoIP │ TAK Integration │
├─────────────────────────────────────────────────────────────────┤
│          Message Bus (Redis/RabbitMQ) + WebSocket Layer         │
├─────────────────────────────────────────────────────────────────┤
│ PostgreSQL │ InfluxDB │ Elasticsearch │ MinIO │ Redis Cache    │
├─────────────────────────────────────────────────────────────────┤
│        Monitoring (Prometheus/Grafana) + Logging (ELK)         │
└─────────────────────────────────────────────────────────────────┘
```

### Core Services Architecture

#### 1. API Gateway & Core Services
- **Technology**: Node.js + Express + TypeScript
- **Authentication**: LDAP/AD integration with JWT tokens
- **API Documentation**: OpenAPI/Swagger
- **Rate Limiting**: Redis-based throttling
- **Load Balancing**: NGINX reverse proxy

#### 2. Playbook Engine
- **Rule Engine**: YAML/JSON configuration
- **Workflow Automation**: Role-based routing
- **Approval Chains**: G1-G9 + FSCC + TACP roles
- **Escalation Matrix**: Time-based automatic routing
- **Template Management**: Common scenario handling

#### 3. Federation & Sync Service
- **Conflict Resolution**: UUID-based merge strategy
- **Transport Security**: TLS 1.3 + mutual authentication
- **Sync Modes**: Push/pull, pub/sub, scheduled
- **Offline Support**: Local SQLite with sync queue
- **Network Resilience**: Automatic retry with backoff

#### 4. VoIP Communications Service
- **SIP Server**: Asterisk/FreeSWITCH backend
- **WebRTC**: Browser-based calling interface
- **Call Recording**: Automated session capture
- **Voice Transcription**: Real-time speech-to-text
- **Conference Management**: Multi-party coordination

#### 5. TAK Integration Service
- **CoT Messaging**: Cursor-on-Target protocol handler
- **XMPP Integration**: Structured report ingestion
- **Geospatial Engine**: CesiumJS 3D mapping
- **Incident Visualization**: Real-time overlay system
- **GeoChat Processing**: Military message parsing

#### 6. Radio Intelligence Service (SIGINT)
- **SDR Integration**: GNU Radio + RTL-SDR drivers
- **Protocol Decoders**: P25, DMR, TETRA, Analog FM
- **Speech Processing**: OpenAI Whisper for transcription
- **Pattern Analysis**: Real-time signal classification
- **Data Storage**: InfluxDB for time-series audio data

### Data Architecture

#### Primary Database (PostgreSQL)
```sql
-- Core schema structure
campaigns/
├── operations/
│   ├── incidents/
│   │   ├── messages
│   │   ├── attachments
│   │   └── status_history
│   ├── participants
│   ├── reports_and_returns
│   └── permissions
├── users/
│   ├── roles
│   └── access_controls
└── audit_logs
```

#### Time-Series Database (InfluxDB)
```
radio_transmissions/
├── frequency_data
├── signal_strength
├── protocol_info
└── audio_metadata

voice_communications/
├── call_records
├── transcription_data
└── quality_metrics
```

#### Search Engine (Elasticsearch)
```
full_text_search/
├── incident_content
├── reports_and_returns
├── participants
├── radio_transcripts
├── voice_transcripts
└── document_attachments
```

#### Binary Storage (MinIO)
```
media_files/
├── audio_recordings/
├── document_attachments/
├── image_evidence/
└── backup_archives/
```

### Security Architecture

#### Authentication & Authorization
- **LDAP Integration**: Active Directory binding
- **Role-Based Access**: Operation-level permissions
- **Session Management**: JWT with refresh tokens
- **Audit Logging**: All access and modifications

#### Data Classification
- **Automatic Labeling**: UNCLASS/CONFIDENTIAL/SECRET
- **Cross-Domain**: CDS integration support
- **Data Sanitization**: Automated cleanup routines
- **Access Controls**: Classification-based filtering
- **Spillage Prevention**: Real-time monitoring

#### Transport Security
- **TLS 1.3**: All external communications
- **Mutual Authentication**: Certificate-based validation
- **VPN Support**: Site-to-site tunneling
- **Air-Gap Deployment**: Offline installation packages
- **Encryption at Rest**: Database and file encryption

### Deployment Architecture

#### Cloud Deployment (AWS)
```
Production Environment:
├── Application Tier (ECS containers)
├── Database Tier (RDS + managed services)
├── Message Tier (ElastiCache + Message Queue)
├── Storage Tier (S3 + CDN)
└── Monitoring Tier (CloudWatch)
```

# TACTIX Development Plan - Updated Priorities

## Project Overview

**TACTIX** is a mission-critical collaborative incident management platform for tactical operations, designed for Canadian use but supports NATO format with full coalition interoperability.

## Core Value Proposition

**Multi-user tactical incident coordination real-time collaboration.**

## Development Priorities

### Phase 1: Core Foundation (Weeks 1-2) 🚨 CRITICAL

**1.1 Collaborative Incident Management**
- Real-time incident creation, updates, and status tracking
- Multi-user collaboration on incidents
- Role-based incident routing and approval workflows
- Campaign → Operation → Incident hierarchy
- Pending queue system with role-based review

**1.2 LDAP/Active Directory Integration**
- AWS Directory Service or external AD connector support
- G-role mapping (G1-G9, FSCC, TACP, IMO)
- AD group-based operation access control
- IMO override mechanisms for sensitive operations
- Role elevation system within TACTIX

### Phase 2: Enhanced Capabilities (Weeks 3-4) 📍 IMPORTANT

**2.1 TAK Integration & Geospatial**
- TAK server connectivity with CoT messaging
- GeoChat/XMPP structured report ingestion
- Incident location mapping and tracking

**2.2 MIP 5.3 Compliance**
- Message and report and returns will be compliant to MIP 5.3

**2.3 AWS CDK Infrastructure**
- Containarization (Docker)
- S3 buckets for file storage with versioning

**2.4 Playbook Engine**
- YAML/JSON configurable routing rules
- Automated incident routing to appropriate G-roles
- Approval chain management and escalation matrices
- Template management for common incident scenarios
- Auto/manual incident creation from external sources

### Phase 3: Federation & Interoperability (Week 5) 🌐 SCALING

**3.1 Federation & Synchronization**
- REST-based federation between TACTIX instances
- Conflict resolution with UUID-based timestamps
- Push/pull and pub/sub synchronization modes

**3.2 Virtual Duty Officer**
- Emulate real-world DO functions: situational awareness, communications management, decision escalation.
- Support Canadian operational procedures.

### Phase 4: Future Enhancements 🔮 FUTURE

**4.1 Communications Integration**
- SIP/VoIP communications platform
- WebRTC browser-based calling
- Conference calling for operations coordination
- Call recording and incident correlation
- Push-to-talk functionality

**4.2 Voice Processing**
- Voice-to-text transcription capabilities
- Voice command recognition for hands-free operation
- Multi-language support for coalition operations
- Audio note recording and transcription

**4.3 Future Federation & Synchronization**
- Offline queue management for air-gapped environments
- Cross-domain solutions (CDS) integration support

## Technical Architecture

### Core Technology Stack
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + TypeScript + CesiumJS
- **Database:** PostgreSQL with MIP 5.3 metadata support
- **Authentication:** LDAP/AD with JWT tokens
- **Search:** Elasticsearch for full-text search
- **Cache:** Redis for session management
- **Message Queue:** Redis/RabbitMQ for real-time updates
- **Infrastructure:** AWS CDK with containerized deployment

### Security & Compliance
- **Classification Level:** Protected B / NATO Restricted
- **Authentication:** LDAP/AD integration with MFA support
- **Access Control:** Role-based with metadata filtering
- **Encryption:** TLS 1.3 in transit, AES-256 at rest
- **Audit Logging:** All user actions and data access
- **Compliance:** ACP-240, STANAG 4774/4778 compatible

## Success Criteria

### Phase 1 Complete When:
- ✅ **Operational view** and real-time monitoring of the chat
- ✅ **Multi-user incident creation** and real-time collaboration working
- ✅ **LDAP authentication** with G-role mapping functional
- ✅ **Role-based incident routing** operational
- ✅ **Campaign/Operation/Incident hierarchy** implemented
- ✅ **Pending queue system** with approval workflows active

### Phase 2 Complete When:
- ✅ **Docker Containerization**
- ✅ **MIP 5.3 metadata** compliance implemented
- ✅ **Playbook engine** with automated routing active
- ✅ **Virtual Duty Officer (VDO)** for operation oversight and COA recommendations

### Phase 3 Complete When:
- ✅ **Multi-instance federation** synchronization working
- ✅ **Production deployment** ready for tactical operations