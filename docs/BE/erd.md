# ERD — TerraSpace Booking System

## 1. Overview

Dokumen ini mendefinisikan struktur database untuk **TerraSpace**, sebuah sistem booking coworking space. Database menggunakan **PostgreSQL** dengan **Prisma ORM**.

Cakupan tabel dibatasi hanya pada entitas yang benar-benar dipakai dalam alur booking system (autentikasi user, katalog lokasi & workspace, proses booking, amenities, dan pengaturan admin). Beberapa penyesuaian dilakukan dari skema sebelumnya:

- **Table `Guest` dihapus.** Manajemen guest terpisah tidak lagi diperlukan di scope ini — akses ke workspace tetap ditangani lewat `access_code` yang sudah melekat pada `bookings`. Kalau nanti ada kebutuhan multi-guest per booking (invite beberapa orang dengan jadwal akses berbeda), ini bisa jadi fitur terpisah di iterasi berikutnya, bukan bagian dari core booking flow sekarang.
- **`amenities` dinormalisasi.** Sebelumnya `Location.amenities` dan `Workspace.amenities` disimpan sebagai `string[]` tanpa constraint relasional (rawan typo, tidak bisa di-JOIN, tidak ada referential integrity). Di ERD ini dipecah jadi tabel junction `location_amenities` dan `workspace_amenities` yang mereferensikan `amenities.id`.
- **Tipe data uang diseragamkan ke `DECIMAL(12,2)`** (bukan `BigInt`) supaya representasi nilai pecahan mata uang eksplisit dan konsisten dengan `tax_percent` yang sudah `DECIMAL`.
- **`start_time` / `end_time` diubah ke tipe `TIME`** (bukan string bebas) supaya validasi format & perbandingan waktu terjamin di level database.
- **FK `workspaces → locations` diarahkan ke `location_id` (UUID), bukan `location_slug`.** Slug tetap dipertahankan di tabel `locations` untuk kebutuhan URL, tapi relasi FK sebaiknya ke primary key, bukan business key yang berpotensi berubah.
- **`workspace_name` dan `location_slug` di `bookings` dipertahankan sebagai snapshot** (bukan dihapus) — ini bukan redundansi yang salah, melainkan pola _historical snapshot_ supaya riwayat booking tidak berubah retroaktif kalau nama workspace/lokasi di-edit admin di kemudian hari.
- **`Amenity.nameId` (nama Bahasa Indonesia) dihapus** karena sistem sudah diputuskan English-only, jadi field tersebut tidak terpakai.

Tabel yang dipakai: `users`, `profiles`, `sessions`, `locations`, `workspaces`, `amenities`, `location_amenities`, `workspace_amenities`, `bookings`, `admin_settings`.

---

## 2. ERD Keseluruhan

```mermaid
erDiagram
    USERS ||--o| PROFILES : "has"
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ BOOKINGS : "creates"

    LOCATIONS ||--o{ WORKSPACES : "contains"
    WORKSPACES ||--o{ BOOKINGS : "is booked in"

    LOCATIONS ||--o{ LOCATION_AMENITIES : "has"
    AMENITIES ||--o{ LOCATION_AMENITIES : "assigned to"

    WORKSPACES ||--o{ WORKSPACE_AMENITIES : "has"
    AMENITIES ||--o{ WORKSPACE_AMENITIES : "assigned to"

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        timestamp created_at
        timestamp updated_at
    }

    PROFILES {
        uuid id PK_FK
        varchar full_name
        varchar phone
        varchar company
        varchar role
        timestamp created_at
        timestamp updated_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        timestamp expires_at
    }

    LOCATIONS {
        uuid id PK
        varchar slug UK
        varchar name
        text address
        varchar city
        text image_url
        text description
        varchar hours
        boolean access_247
        decimal latitude
        decimal longitude
        int access_radius_meters
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    WORKSPACES {
        uuid id PK
        uuid location_id FK
        varchar name
        varchar type
        varchar floor
        decimal price
        varchar unit
        varchar availability
        text_array slots
        text image_url
        text description
        text cancellation_policy
        boolean simple_booking
        varchar calendar_sync
        varchar qr_provider
        timestamp created_at
        timestamp updated_at
    }

    AMENITIES {
        uuid id PK
        varchar name
        varchar category
        varchar icon
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    LOCATION_AMENITIES {
        uuid location_id PK_FK
        uuid amenity_id PK_FK
    }

    WORKSPACE_AMENITIES {
        uuid workspace_id PK_FK
        uuid amenity_id PK_FK
    }

    BOOKINGS {
        uuid id PK
        uuid user_id FK
        uuid workspace_id FK
        varchar workspace_name_snapshot
        varchar location_slug_snapshot
        date booking_date
        time start_time
        time end_time
        decimal total_amount
        varchar payment_method
        varchar status
        varchar reference UK
        varchar access_code UK
        timestamp created_at
    }

    ADMIN_SETTINGS {
        boolean id PK
        varchar company_name
        varchar support_email
        varchar currency
        decimal tax_percent
        int cancellation_window_hours
        int advance_booking_days
        boolean email_notifications_enabled
        timestamp updated_at
    }
```

---

## 3. Detail Per Table

### 3.1 `users`

Menyimpan akun login (customer maupun admin — dibedakan lewat `profiles.role`).

| Kolom           | Tipe Data      | Constraint                                 |
| --------------- | -------------- | ------------------------------------------ |
| `id`            | `UUID`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` |
| `email`         | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`                       |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` (hash, bukan plaintext)         |
| `created_at`    | `TIMESTAMPTZ`  | `NOT NULL`, `DEFAULT now()`                |
| `updated_at`    | `TIMESTAMPTZ`  | `NOT NULL`, auto-update on row change      |

**Relasi:** 1 `users` → 1 `profiles` (opsional dari sisi FK tapi wajib dibuat saat registrasi) · 1 `users` → N `sessions` · 1 `users` → N `bookings`.

**Indexing:**

- `PRIMARY KEY (id)` — otomatis membuat B-Tree index.
- `UNIQUE INDEX idx_users_email ON users(email)` — dipakai untuk lookup saat login & validasi duplikat.

---

### 3.2 `profiles`

Data profil tambahan user, dipisah dari `users` supaya tabel autentikasi tetap ramping. Relasi 1:1 dengan `users` — `id` di sini **sekaligus** primary key dan foreign key (shared PK pattern).

| Kolom        | Tipe Data      | Constraint                                                               |
| ------------ | -------------- | ------------------------------------------------------------------------ |
| `id`         | `UUID`         | `PRIMARY KEY`, `FOREIGN KEY → users(id)`, `ON DELETE CASCADE`            |
| `full_name`  | `VARCHAR(150)` | `NOT NULL`, `DEFAULT ''`                                                 |
| `phone`      | `VARCHAR(20)`  | `NULLABLE`                                                               |
| `company`    | `VARCHAR(150)` | `NULLABLE`                                                               |
| `role`       | `VARCHAR(20)`  | `NOT NULL`, `DEFAULT 'customer'`, `CHECK (role IN ('customer','admin'))` |
| `created_at` | `TIMESTAMPTZ`  | `NOT NULL`, `DEFAULT now()`                                              |
| `updated_at` | `TIMESTAMPTZ`  | `NOT NULL`, auto-update                                                  |

**Relasi:** milik satu `users` (cascade delete — profil ikut terhapus kalau user dihapus).

**Indexing:**

- `PRIMARY KEY (id)` — index sekaligus dipakai sebagai FK ke `users`, tidak perlu index tambahan.
- `INDEX idx_profiles_role ON profiles(role)` — optimasi query admin yang filter user berdasarkan role.

---

### 3.3 `sessions`

Menyimpan sesi login aktif (dipakai untuk validasi token/cookie session).

| Kolom        | Tipe Data     | Constraint                                                 |
| ------------ | ------------- | ---------------------------------------------------------- |
| `id`         | `UUID`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                 |
| `user_id`    | `UUID`        | `NOT NULL`, `FOREIGN KEY → users(id)`, `ON DELETE CASCADE` |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL`                                                 |

**Relasi:** N `sessions` → 1 `users`.

**Indexing:**

- `PRIMARY KEY (id)`.
- `INDEX idx_sessions_user_id ON sessions(user_id)` — untuk mengambil semua sesi milik satu user (mis. saat logout-all-device).
- `INDEX idx_sessions_expires_at ON sessions(expires_at)` — untuk job pembersihan sesi kedaluwarsa.

---

### 3.4 `locations`

Master data lokasi cabang coworking space.

| Kolom                  | Tipe Data      | Constraint                                                                |
| ---------------------- | -------------- | ------------------------------------------------------------------------- |
| `id`                   | `UUID`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                                |
| `slug`                 | `VARCHAR(100)` | `UNIQUE`, `NOT NULL` (dipakai di URL)                                     |
| `name`                 | `VARCHAR(150)` | `NOT NULL`                                                                |
| `address`              | `TEXT`         | `NOT NULL`                                                                |
| `city`                 | `VARCHAR(100)` | `NOT NULL`                                                                |
| `image_url`            | `TEXT`         | `NULLABLE`                                                                |
| `description`          | `TEXT`         | `NOT NULL`, `DEFAULT ''`                                                  |
| `hours`                | `VARCHAR(100)` | `NOT NULL`, `DEFAULT 'Mon–Sun 09:00–22:00'`                               |
| `access_247`           | `BOOLEAN`      | `NOT NULL`, `DEFAULT false`                                               |
| `latitude`             | `DECIMAL(9,6)` | `NULLABLE`                                                                |
| `longitude`            | `DECIMAL(9,6)` | `NULLABLE`                                                                |
| `access_radius_meters` | `INT`          | `NOT NULL`, `DEFAULT 50`, `CHECK (access_radius_meters > 0)`              |
| `status`               | `VARCHAR(20)`  | `NOT NULL`, `DEFAULT 'active'`, `CHECK (status IN ('active','inactive'))` |
| `created_at`           | `TIMESTAMPTZ`  | `NOT NULL`, `DEFAULT now()`                                               |
| `updated_at`           | `TIMESTAMPTZ`  | `NOT NULL`, auto-update                                                   |

**Relasi:** 1 `locations` → N `workspaces` · M:N ke `amenities` lewat `location_amenities`.

**Indexing:**

- `PRIMARY KEY (id)`.
- `UNIQUE INDEX idx_locations_slug ON locations(slug)`.
- `INDEX idx_locations_city ON locations(city)` — filter katalog by kota.
- `INDEX idx_locations_status ON locations(status)` — filter lokasi aktif di storefront.

---

### 3.5 `workspaces`

Unit ruang/meja yang bisa dibooking, tiap workspace milik satu lokasi.

| Kolom                 | Tipe Data       | Constraint                                                                               |
| --------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| `id`                  | `UUID`          | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                                               |
| `location_id`         | `UUID`          | `NOT NULL`, `FOREIGN KEY → locations(id)`, `ON DELETE CASCADE`                           |
| `name`                | `VARCHAR(150)`  | `NOT NULL`                                                                               |
| `type`                | `VARCHAR(50)`   | `NOT NULL` (mis. `hot_desk`, `private_office`, `meeting_room`)                           |
| `floor`               | `VARCHAR(20)`   | `NOT NULL`, `DEFAULT ''`                                                                 |
| `price`               | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0`, `CHECK (price >= 0)`                                            |
| `unit`                | `VARCHAR(20)`   | `NOT NULL`, `DEFAULT 'hour'`, `CHECK (unit IN ('hour','day','month'))`                   |
| `availability`        | `VARCHAR(20)`   | `NOT NULL`, `DEFAULT 'available'`, `CHECK (availability IN ('available','unavailable'))` |
| `slots`               | `TEXT[]`        | `NOT NULL`, `DEFAULT '{}'` (daftar jam slot yang bisa dipesan)                           |
| `image_url`           | `TEXT`          | `NULLABLE`                                                                               |
| `description`         | `TEXT`          | `NOT NULL`, `DEFAULT ''`                                                                 |
| `cancellation_policy` | `TEXT`          | `NOT NULL`, `DEFAULT ''`                                                                 |
| `simple_booking`      | `BOOLEAN`       | `NOT NULL`, `DEFAULT false`                                                              |
| `calendar_sync`       | `VARCHAR(100)`  | `NULLABLE`                                                                               |
| `qr_provider`         | `VARCHAR(100)`  | `NULLABLE`                                                                               |
| `created_at`          | `TIMESTAMPTZ`   | `NOT NULL`, `DEFAULT now()`                                                              |
| `updated_at`          | `TIMESTAMPTZ`   | `NOT NULL`, auto-update                                                                  |

**Relasi:** N `workspaces` → 1 `locations` · 1 `workspaces` → N `bookings` · M:N ke `amenities` lewat `workspace_amenities`.

**Indexing:**

- `PRIMARY KEY (id)`.
- `INDEX idx_workspaces_location_id ON workspaces(location_id)`.
- `INDEX idx_workspaces_type ON workspaces(type)` — filter katalog by tipe ruang.
- `INDEX idx_workspaces_availability ON workspaces(availability)` — query cepat workspace yang tersedia.

---

### 3.6 `amenities`

Master data fasilitas (Wi-Fi, AC, proyektor, dll) yang bisa di-assign ke lokasi maupun workspace.

| Kolom        | Tipe Data      | Constraint                                                                |
| ------------ | -------------- | ------------------------------------------------------------------------- |
| `id`         | `UUID`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                                |
| `name`       | `VARCHAR(100)` | `NOT NULL`                                                                |
| `category`   | `VARCHAR(50)`  | `NOT NULL`, `DEFAULT 'General'`                                           |
| `icon`       | `VARCHAR(50)`  | `NOT NULL`, `DEFAULT 'tag'`                                               |
| `status`     | `VARCHAR(20)`  | `NOT NULL`, `DEFAULT 'active'`, `CHECK (status IN ('active','inactive'))` |
| `created_at` | `TIMESTAMPTZ`  | `NOT NULL`, `DEFAULT now()`                                               |
| `updated_at` | `TIMESTAMPTZ`  | `NOT NULL`, auto-update                                                   |

**Relasi:** M:N ke `locations` lewat `location_amenities` · M:N ke `workspaces` lewat `workspace_amenities`.

**Indexing:**

- `PRIMARY KEY (id)`.
- `UNIQUE INDEX idx_amenities_name ON amenities(name)` — cegah duplikat nama fasilitas.
- `INDEX idx_amenities_category ON amenities(category)`.

---

### 3.7 `location_amenities` (junction table)

Menghubungkan `locations` dan `amenities` secara many-to-many.

| Kolom         | Tipe Data | Constraint                                                     |
| ------------- | --------- | -------------------------------------------------------------- |
| `location_id` | `UUID`    | `NOT NULL`, `FOREIGN KEY → locations(id)`, `ON DELETE CASCADE` |
| `amenity_id`  | `UUID`    | `NOT NULL`, `FOREIGN KEY → amenities(id)`, `ON DELETE CASCADE` |

**Constraint:** `PRIMARY KEY (location_id, amenity_id)` — composite key sekaligus mencegah pasangan duplikat.

**Indexing:**

- `PRIMARY KEY (location_id, amenity_id)`.
- `INDEX idx_location_amenities_amenity_id ON location_amenities(amenity_id)` — untuk query terbalik ("lokasi mana saja yang punya amenity X").

---

### 3.8 `workspace_amenities` (junction table)

Menghubungkan `workspaces` dan `amenities` secara many-to-many.

| Kolom          | Tipe Data | Constraint                                                      |
| -------------- | --------- | --------------------------------------------------------------- |
| `workspace_id` | `UUID`    | `NOT NULL`, `FOREIGN KEY → workspaces(id)`, `ON DELETE CASCADE` |
| `amenity_id`   | `UUID`    | `NOT NULL`, `FOREIGN KEY → amenities(id)`, `ON DELETE CASCADE`  |

**Constraint:** `PRIMARY KEY (workspace_id, amenity_id)`.

**Indexing:**

- `PRIMARY KEY (workspace_id, amenity_id)`.
- `INDEX idx_workspace_amenities_amenity_id ON workspace_amenities(amenity_id)`.

---

### 3.9 `bookings`

Transaksi booking workspace oleh user. Ini tabel inti dari booking system.

| Kolom                     | Tipe Data       | Constraint                                                                                             |
| ------------------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| `id`                      | `UUID`          | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                                                             |
| `user_id`                 | `UUID`          | `NOT NULL`, `FOREIGN KEY → users(id)`, `ON DELETE CASCADE`                                             |
| `workspace_id`            | `UUID`          | `NOT NULL`, `FOREIGN KEY → workspaces(id)`, `ON DELETE RESTRICT`                                       |
| `workspace_name_snapshot` | `VARCHAR(150)`  | `NOT NULL` (nama workspace saat booking dibuat)                                                        |
| `location_slug_snapshot`  | `VARCHAR(100)`  | `NOT NULL` (slug lokasi saat booking dibuat)                                                           |
| `booking_date`            | `DATE`          | `NOT NULL`                                                                                             |
| `start_time`              | `TIME`          | `NOT NULL`                                                                                             |
| `end_time`                | `TIME`          | `NOT NULL`, `CHECK (end_time > start_time)`                                                            |
| `total_amount`            | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0`, `CHECK (total_amount >= 0)`                                                   |
| `payment_method`          | `VARCHAR(30)`   | `NOT NULL`, `DEFAULT 'card'`, `CHECK (payment_method IN ('card','bank_transfer','ewallet'))`           |
| `status`                  | `VARCHAR(20)`   | `NOT NULL`, `DEFAULT 'confirmed'`, `CHECK (status IN ('pending','confirmed','cancelled','completed'))` |
| `reference`               | `VARCHAR(50)`   | `UNIQUE`, `NOT NULL` (kode referensi transaksi, dipakai user)                                          |
| `access_code`             | `VARCHAR(20)`   | `UNIQUE`, `NOT NULL` (kode akses masuk workspace)                                                      |
| `created_at`              | `TIMESTAMPTZ`   | `NOT NULL`, `DEFAULT now()`                                                                            |

**Relasi:** N `bookings` → 1 `users` · N `bookings` → 1 `workspaces`.

> Catatan desain: FK ke `workspaces` pakai `ON DELETE RESTRICT`, bukan `CASCADE` — workspace yang punya riwayat booking tidak boleh dihapus begitu saja (bisa di-nonaktifkan lewat `availability`/`status` saja) supaya histori transaksi tidak hilang.

**Indexing:**

- `PRIMARY KEY (id)`.
- `INDEX idx_bookings_user_id ON bookings(user_id)`.
- `INDEX idx_bookings_workspace_id ON bookings(workspace_id)`.
- `INDEX idx_bookings_booking_date ON bookings(booking_date)` — untuk cek ketersediaan per tanggal.
- `INDEX idx_bookings_status ON bookings(status)`.
- `UNIQUE INDEX idx_bookings_reference ON bookings(reference)`.
- `UNIQUE INDEX idx_bookings_access_code ON bookings(access_code)`.
- `INDEX idx_bookings_workspace_date ON bookings(workspace_id, booking_date)` — composite index, optimasi query pengecekan bentrok jadwal (paling sering dipakai saat validasi booking baru).

---

### 3.10 `admin_settings`

Tabel konfigurasi global sistem, didesain sebagai **singleton** (hanya boleh berisi 1 baris).

| Kolom                         | Tipe Data      | Constraint                                                         |
| ----------------------------- | -------------- | ------------------------------------------------------------------ |
| `id`                          | `BOOLEAN`      | `PRIMARY KEY`, `DEFAULT true`                                      |
| `company_name`                | `VARCHAR(150)` | `NOT NULL`, `DEFAULT 'TerraSpace'`                                 |
| `support_email`               | `VARCHAR(255)` | `NULLABLE`                                                         |
| `currency`                    | `VARCHAR(10)`  | `NOT NULL`, `DEFAULT 'USD'`                                        |
| `tax_percent`                 | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0`, `CHECK (tax_percent BETWEEN 0 AND 100)`   |
| `cancellation_window_hours`   | `INT`          | `NOT NULL`, `DEFAULT 24`, `CHECK (cancellation_window_hours >= 0)` |
| `advance_booking_days`        | `INT`          | `NOT NULL`, `DEFAULT 30`, `CHECK (advance_booking_days > 0)`       |
| `email_notifications_enabled` | `BOOLEAN`      | `NOT NULL`, `DEFAULT true`                                         |
| `updated_at`                  | `TIMESTAMPTZ`  | `NOT NULL`, auto-update                                            |

**Relasi:** tidak ada FK — tabel konfigurasi berdiri sendiri, dibaca oleh proses booking (tax, jendela pembatalan, batas booking di muka) dan storefront (currency, company info).

> Catatan desain: pola singleton di sini ditegakkan lewat `id BOOLEAN PRIMARY KEY DEFAULT true` — karena tipe `BOOLEAN` cuma punya 2 kemungkinan nilai dan PK harus unik, secara praktis hanya `id = true` yang dipakai, memastikan insert baris kedua akan selalu gagal karena bentrok primary key.

**Indexing:**

- `PRIMARY KEY (id)` — cukup, karena tabel hanya berisi 1 baris.
