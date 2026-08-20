mermaid sequenceDiagram diagram always shows diagram syntax issue (falling back to raw view )


SequenceDiagram
Autonumber
Participant Client
Participant API as API Gateway
Participant Ingest as Ingestion Service
Participant Queue as Message Queue
Participant Process as Processing Service
Participant Storage as Storage Service
Participant Notify as Notification Service

Rect rgb(240, 248, 255)
    Note over Client,API: Phase 1: Document Upload
    Client->>API: POST /documents<br/>Upload file (multipart)
    Activate API
    API->>API: Validate file type & size
    Alt Valid document
        API->>Ingest: Forward document + metadata
        Activate Ingest
        Ingest->>Storage: Save raw file
        Activate Storage
        Storage-->>Ingest: File ID + location
        Deactivate Storage
        
        Ingest->>Queue: Publish processing job<br/>(async)
        Ingest-->>API: Job ID + status: "accepted"
        Deactivate Ingest
        
        API-->>Client: 202 Accepted<br/>{jobId, status}
        Deactivate API
    Else Invalid document
        API-->>Client: 400 Bad Request<br/>{error: "Invalid format"}
        Deactivate API
    End
End

Rect rgb(240, 255, 240)
    Note over Queue,Notify: Phase 2: Async Processing
    Queue->>Process: Consume job message
    Activate Process
    
    Process->>Storage: Retrieve raw file
    Activate Storage
    Storage-->>Process: File content
    Deactivate Storage
    
    Process->>Process: Extract text & metadata
    Process->>Process: Run OCR if needed
    Process->>Process: Generate embeddings
    
    Process->>Storage: Store processed data<br/>+ extracted content
    Activate Storage
    Storage-->>Process: Confirmation
    Deactivate Storage
    
    Process->>Queue: Mark job complete
    Process-->>Queue: Acknowledge
    Deactivate Process
End

Rect rgb(255, 250, 240)
    Note over Notify,Client: Phase 3: Notification
    Queue->>Notify: Trigger notification event
    Activate Notify
    Notify->>Client: WebSocket/Push:<br/>"Processing complete"
    Deactivate Notify
End

Opt Error Handling
    Process--xProcess: Processing failed
    Process->>Queue: Publish failure event
    Queue->>Notify: Send error notification
    Notify->>Client: "Processing failed"<br/>{error details}
End
