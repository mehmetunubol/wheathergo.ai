mermaid
erDiagram
    users {
        uuid id PK
        varchar username UNIQUE
        varchar password_hash
        varchar email UNIQUE
        timestamp created_at
        timestamp updated_at
    }

    roles {
        uuid id PK
        varchar name UNIQUE
        timestamp created_at
        timestamp updated_at
    }

    permissions {
        uuid id PK
        varchar name UNIQUE
        timestamp created_at
        timestamp updated_at
    }

    user_roles {
        uuid user_id FK
        uuid role_id FK
        timestamp assigned_at
    }

    role_permissions {
        uuid role_id FK
        uuid permission_id FK
        timestamp granted_at
    }

    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "is assigned"
    roles ||--o{ role_permissions : "has"
    permissions ||--o{ role_permissions : "is granted"

    locations {
        uuid location_id PK
        uuid user_id FK
        varchar name
        decimal latitude
        decimal longitude
        timestamp created_at
        timestamp updated_at
    }

    weather_data {
        uuid weather_id PK
        uuid location_id FK
        timestamp timestamp
        decimal temperature
        varchar conditions
        decimal humidity
        decimal wind_speed
        decimal precipitation
        timestamp created_at
    }

    outfit_suggestions {
        uuid suggestion_id PK
        uuid user_id FK
        uuid weather_id FK
        jsonb clothing_items
        timestamp created_at
    }

    activity_suggestions {
        uuid activity_id PK
        uuid user_id FK
        uuid weather_id FK
        varchar activity_type
        jsonb suggestions
        timestamp created_at
    }

    user_profiles {
        uuid profile_id PK
        uuid user_id FK
        varchar family_member_name
        integer age
        jsonb sensitivities
        timestamp created_at
        timestamp updated_at
    }

    travel_plans {
        uuid travel_plan_id PK
        uuid user_id FK
        varchar name
        date start_date
        date end_date
        uuid destination_location_id FK
        timestamp created_at
        timestamp updated_at
    }

    users ||--o{ locations : "saves"
    locations ||--o{ weather_data : "has"
    users ||--o{ outfit_suggestions : "receives"
    weather_data ||--o{ outfit_suggestions : "leads to"
    users ||--o{ activity_suggestions : "receives"
    weather_data ||--o{ activity_suggestions : "leads to"
    users ||--o{ user_profiles : "has"
    users ||--o{ travel_plans : "creates"
    travel_plans ||--o{ locations : "has destination"
