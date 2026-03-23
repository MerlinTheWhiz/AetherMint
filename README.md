# AetherMint

AetherMint is a decentralized learning and credential verification platform powered by Stellar blockchain. It enables secure, tamper-proof issuance and verification of educational credentials, certificates, and achievements using Soroban smart contracts.

## 🎯 Features

- 📚 **Decentralized Learning** - Course creation and management on blockchain
- 🎓 **Credential Verification** - Tamper-proof certificates and achievements
- 🔗 **Stellar Integration** - Fast, low-cost transactions on Stellar
- 💼 **Professional Profiles** - On-chain learning history and skills
- 🏆 **Achievement System** - NFT-based badges and milestones
- 📊 **Learning Analytics** - Progress tracking and insights
- 🔐 **Secure Storage** - IPFS integration for content persistence
- 🌐 **Cross-Platform** - Web and mobile applications

## 🛠️ Technology Stack

### **Blockchain Layer**
- **Stellar** - Fast, scalable Layer 1 blockchain
- **Soroban** - Smart contract platform for Stellar
- **Stellar SDK** - JavaScript/TypeScript integration

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Stellar Wallets** - Freighter, Albedo, and more
- **IPFS** - Decentralized content storage

### **Backend**
- **Node.js** - Server-side JavaScript runtime
- **Express.js** - Fast, minimalist web framework
- **PostgreSQL** - Robust relational database
- **Redis** - High-performance caching
- **Prisma** - Modern database ORM
- **JWT** - Secure authentication
- **IPFS HTTP Client** - Decentralized storage integration

### **Smart Contracts**
- **Rust** - Memory-safe smart contract language
- **Soroban SDK** - Stellar smart contract development
- **Cairo Compatibility** - Cross-platform contract support

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL
- Redis
- Freighter or compatible Stellar wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/jobbykings/aethermint-education.git
cd aethermint-education

# Install dependencies
npm run install:all

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development
npm run dev
```

### Development Setup

```bash
# Start Stellar network (local)
stellar standalone start

# Deploy contracts
cd contracts
npm run deploy:local

# Start backend
cd ../backend
npm run dev

# Start frontend
cd ../frontend
npm run dev
```

## 📁 Project Structure

```
aethermint-education/
├── contracts/              # Soroban smart contracts (Rust)
│   ├── src/
│   │   ├── lib.rs       # Main contract logic
│   │   └── test.rs      # Contract tests
│   └── Cargo.toml        # Rust dependencies
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/    # Reusable UI components
│   │   └── lib/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                # Node.js API server
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Auth and validation
│   │   └── utils/         # Helper functions
│   └── package.json        # Backend dependencies
├── docs/                   # Project documentation
├── scripts/                # Deployment and utility scripts
└── .github/               # GitHub workflows and templates
    ├── workflows/           # CI/CD pipelines
    └── ISSUE_TEMPLATE/      # Issue templates
```

## 🔧 Smart Contracts

The core Soroban contracts handle:

- **CredentialRegistry** - Stores and verifies educational credentials
- **CourseManager** - Manages course creation and enrollment
- **AchievementIssuer** - Handles NFT-based achievement badges
- **ProfileManager** - Manages on-chain learning profiles

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Token refresh

### Courses
- `GET /api/courses` - List available courses
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Course details
- `POST /api/courses/:id/enroll` - Enroll in course

### Credentials
- `POST /api/credentials/issue` - Issue new credential
- `GET /api/credentials/:id` - Verify credential
- `GET /api/credentials/user/:address` - User credentials

### Profiles
- `GET /api/profiles/:address` - Learning profile

### IPFS Content Management
- `POST /api/content/upload` - Upload file to IPFS
- `POST /api/content/upload/batch` - Upload multiple files
- `GET /api/content/:cid` - Retrieve content from IPFS
- `GET /api/content/:cid/metadata` - Get content metadata
- `POST /api/content/:cid/pin` - Pin content to IPFS
- `DELETE /api/content/:cid/pin` - Unpin content from IPFS
- `GET /api/content/health` - Check IPFS service health

## 📁 IPFS Integration

AetherMint integrates with IPFS (InterPlanetary File System) for decentralized content storage, providing:

### Features
- **File Upload & Storage** - Upload educational content to IPFS with metadata
- **Content Retrieval** - Retrieve content in multiple formats (buffer, base64, stream)
- **Progress Tracking** - Real-time upload progress with WebSocket support
- **Authentication** - JWT-based auth with role-based permissions
- **Caching** - In-memory caching for improved performance
- **Error Handling** - Comprehensive error handling with retry mechanisms

### Usage
```typescript
import ipfsClient from './lib/ipfs';

// Upload a file
const result = await ipfsClient.uploadFile(file, {
  metadata: { course: 'math101' },
  onProgress: (progress) => console.log(`${progress.progress}%`)
});

// Retrieve content
const content = await ipfsClient.getContent(result.cid, 'base64');
```

### Configuration
See `backend/.env.example` for IPFS configuration options.

For detailed documentation, see [IPFS_INTEGRATION_README.md](./IPFS_INTEGRATION_README.md).

## 🎓 Use Cases

### For Students
- **Earn Verifiable Certificates** - Complete courses, earn blockchain-verified credentials
- **Build On-Chain Portfolio** - Showcase learning history and achievements
- **Lifelong Learning Records** - Persistent, portable academic records

### For Educators
- **Create Blockchain Courses** - Deploy courses with smart contract integration
- **Issue Digital Certificates** - Automate credential issuance
- **Track Student Progress** - Monitor engagement and completion

### For Institutions
- **Verify Credentials Instantly** - Eliminate fraud with on-chain verification
- **Reduce Administrative Overhead** - Automate certificate management
- **Global Credential Recognition** - Cross-border verification

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### 🐛 Found a Bug?
- [Create an issue](https://github.com/jobbykings/aethermint-education/issues/new?assignees=&labels=bug&template=bug_report.md)

### 💡 Feature Request?
- [Suggest a feature](https://github.com/jobbykings/aethermint-education/issues/new?assignees=&labels=enhancement&template=feature_request.md)

### 🔒 Security Issue?
- Email: security@aethermint-education.org
- [Security template](https://github.com/jobbykings/aethermint-education/issues/new?assignees=&labels=security&template=security_vulnerability.md)

## 👥 Contributors

Thanks to all our contributors! See the [CONTRIBUTORS.md](CONTRIBUTORS.md) file for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Community

- [Discord](https://discord.gg/aethermint-education)
- [Twitter](https://twitter.com/aethermint_education)
- [GitHub Discussions](https://github.com/jobbykings/aethermint-education/discussions)
- [Website](https://aethermint-education.org)

## 📊 Project Status

- **Version**: 0.1.0 (Alpha)
- **Network**: Stellar Testnet
- **Status**: Under Development
- **Roadmap**: [View Project Board](https://github.com/jobbykings/aethermint-education/projects)

---

⭐ Star this repository to support decentralized education on Stellar!
