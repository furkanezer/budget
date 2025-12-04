# Budget Docker Compose App

Modern bütçe uygulaması: kullanıcı girişi, admin paneli, gelir/gider takibi, öneri ve analitik özetleri. Backend FastAPI, frontend React (Vite) ve Postgres veritabanı ile Docker Compose üzerinden çalışır.

## Kurulum ve Çalıştırma Adımları

1. Ortam dosyasını hazırlayın (değiştirmek isterseniz düzenleyin):
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Docker bileşenlerini derleyip başlatın:
   ```bash
   docker compose up --build
   ```
3. Servislerin hazır olmasını bekleyin ve arayüze gidin:
   - Backend API: http://localhost:9050 (Swagger: `/docs`)
   - Frontend: http://localhost:4173
4. Varsayılan admin girişi (docker-compose environment): `admin@example.com` / `admin1234`
5. (İsteğe bağlı) Yerel geliştirme için backend'i doğrudan çalıştırma:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 9050 --reload --app-dir backend
   ```

## Çalıştırma

Kurulum adımlarındaki `docker compose up --build` komutu veritabanı, backend ve frontend servislerini birlikte ayağa kaldırır. İlk açılışta imajlar indirileceği için biraz zaman alabilir; servisler sağlıklı hale geldiğinde URL'lere erişebilirsiniz. Durdurmak için `Ctrl+C` veya `docker compose down` kullanın.

## Özellikler
- JWT tabanlı kimlik doğrulama (kayıt, giriş, /auth/me)
- Gelir/gider ekleme, listeleme, silme
- Aylık trend, kategori bazlı gider dağılımı, tasarruf oranı ve öneriler
- Admin genel bakış: toplam kullanıcı, gelir/gider, son işlemler
