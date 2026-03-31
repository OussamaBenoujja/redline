# RedLine / Fablean Tech Stack and UML

## 1) Frameworks, Tools, and Technologies Used

### Workspace-Level
- Node.js and npm for JavaScript package management and scripts
- Python 3.10+ and pip for GPU service
- Docker and Docker Compose for containerized infrastructure and deployment
- PowerShell scripts for local and remote setup automation
- Git and GitHub for source control and collaboration

### fablean_desktop (Web Frontend)
- React 19
- Vite 8
- React Router DOM
- Socket.IO Client
- Lucide React icon library
- ESLint (with React Hooks and React Refresh plugins)

### fablean_memory (Backend API and Data)
- Node.js
- Express 5
- PostgreSQL 16
- TypeORM DataSource (query execution + schema bootstrap)
- pg driver
- Socket.IO (real-time notifications)
- JWT (jsonwebtoken) for auth tokens
- bcryptjs for password hashing
- dotenv for environment variables
- multer for media uploads
- body-parser and cors middleware

### fablean_mobile (Mobile App)
- React Native
- Expo SDK 54
- expo-auth-session
- expo-constants
- expo-web-browser
- expo-status-bar

### fablean_lab (Desktop Prototype)
- Electron 34
- dotenv

### gpu_service (AI Inference Service)
- FastAPI
- Uvicorn
- PyTorch
- Diffusers
- Transformers
- Accelerate
- Hugging Face Hub
- Safetensors
- BitsAndBytes
- PEFT
- SciPy
- Pydantic
- python-multipart

### AI / Model Stack
- FLUX image generation pipeline
- SDXL pipeline fallback + scheduler options
- Qwen 2.5 7B Instruct for LLM scene direction/writing analysis
- LoRA support for style specialization

## 2) UML Class Diagram

```mermaid
classDiagram
    class User {
        +int id
        +string email
        +string password_hash
        +string full_name
        +string bio
        +string avatar_url
        +string banner_url
        +int followers_count
        +int streak_days
        +int coins
        +string badges
        +datetime created_at
    }

    class Novel {
        +string id
        +string title
        +string author_name
        +string genre
        +string status
        +int featured
        +float rating
        +int reads
        +int chapters_count
        +string tags
        +string synopsis
        +string cover_url
        +string cover_photo
        +datetime created_at
        +datetime updated_at
    }

    class Chapter {
        +int id
        +string novel_id
        +string title
        +int chapter_number
        +string full_text
        +datetime created_at
    }

    class Paragraph {
        +string id
        +int chapter_id
        +int idx
        +string text
    }

    class Scene {
        +int id
        +int chapter_id
        +int scene_number
        +int start_char_idx
        +int end_char_idx
        +int start_paragraph_idx
        +int end_paragraph_idx
        +string selected_text
        +string context_notes
        +string prompt_override
        +string image_path
        +string image_status
        +string last_error
    }

    class GeneratedImage {
        +int id
        +string novel_id
        +int chapter_number
        +string paragraph_id
        +string image_path
    }

    class Character {
        +int id
        +string novel_id
        +string name
        +string aliases
        +string importance
        +string base_description
        +string visual_tags
    }

    class CharacterLook {
        +int id
        +int character_id
        +int chapter_from
        +int chapter_to
        +string outfit
        +string silhouette_notes
        +string must_keep
        +string avoid
    }

    class ReadingProgress {
        +int user_id
        +string novel_id
        +float progress
        +int bookmark_idx
        +int offline_downloaded
        +int is_favorite
        +datetime last_read_at
    }

    class Review {
        +int id
        +int user_id
        +string novel_id
        +float rating
        +string text
        +int likes
        +datetime created_at
    }

    class Comment {
        +int id
        +int user_id
        +string novel_id
        +int chapter_id
        +int paragraph_idx
        +string text
        +int likes
        +datetime created_at
    }

    class CommentVote {
        +int user_id
        +int comment_id
        +int vote
        +datetime created_at
        +datetime updated_at
    }

    class CommentReply {
        +int id
        +int comment_id
        +int user_id
        +string text
        +datetime created_at
    }

    class Notification {
        +int id
        +int user_id
        +string type
        +string message
        +int is_read
        +string target_url
        +datetime created_at
    }

    class AuthorFollower {
        +int follower_id
        +int author_id
        +datetime created_at
    }

    Novel "1" --> "many" Chapter : contains
    Chapter "1" --> "many" Paragraph : split_into
    Chapter "1" --> "many" Scene : has
    Novel "1" --> "many" Character : has
    Character "1" --> "many" CharacterLook : evolves_with
    Novel "1" --> "many" GeneratedImage : has
    Paragraph "1" --> "0..1" GeneratedImage : source_for

    User "1" --> "many" ReadingProgress : tracks
    Novel "1" --> "many" ReadingProgress : tracked_by

    User "1" --> "many" Review : writes
    Novel "1" --> "many" Review : receives

    User "1" --> "many" Comment : writes
    Chapter "1" --> "many" Comment : receives
    Comment "1" --> "many" CommentVote : voted_by
    Comment "1" --> "many" CommentReply : replied_with

    User "1" --> "many" Notification : gets
    User "many" --> "many" User : follows_via_AuthorFollower
```

## 3) UML Use Case Diagram

```mermaid
flowchart LR
    reader[Reader]
    author[Author]
    admin[System Admin]
    gpu[GPU Inference Service]

    subgraph Platform[RedLine / Fablean Platform]
        uc1((Sign Up / Login))
        uc2((Browse and Search Novels))
        uc3((Read Novel Chapter))
        uc4((Continue From Last Progress))
        uc5((Rate and Review Novel))
        uc6((Comment, Reply, Vote))
        uc7((Follow Author))
        uc8((Receive and Open Notifications))
        uc9((Create Novel))
        uc10((Edit Novel Metadata and Cover Upload))
        uc11((Publish Chapters))
        uc12((Author Scene Authoring))
        uc13((Generate Scene Prompt))
        uc14((Generate Scene Image))
        uc15((View Author Dashboard Metrics))
        uc16((Seed and Clear Database))
        uc17((Manage Backend and DB Runtime))
    end

    reader --> uc1
    reader --> uc2
    reader --> uc3
    reader --> uc4
    reader --> uc5
    reader --> uc6
    reader --> uc7
    reader --> uc8

    author --> uc1
    author --> uc9
    author --> uc10
    author --> uc11
    author --> uc12
    author --> uc13
    author --> uc14
    author --> uc15
    author --> uc8

    admin --> uc16
    admin --> uc17

    uc14 -. inference .-> gpu
    uc13 -. llm analysis .-> gpu
```

## 4) Notes
- The class diagram is derived from the backend PostgreSQL schema and active API behavior.
- The use case diagram covers reader flows, authoring flows, operations flows, and GPU-assisted AI flows.
