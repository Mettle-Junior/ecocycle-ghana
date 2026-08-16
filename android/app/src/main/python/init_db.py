from app import create_app
from extensions import db
from models import User, PickupRequest, RewardRedemption, Reward
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import random

app = create_app()

with app.app_context():
    db.create_all()
    print("Database tables created successfully!")

    # Check if default admin exists
    admin = User.query.filter_by(username="admin").first()
    if not admin:
        admin = User(
            first_name="System",
            last_name="Admin",
            username="admin",
            phone="0241002000",
            email="admin@ecocycle.gh",
            password=generate_password_hash("admin123"),
            role="admin",
            reward_points=100
        )
        db.session.add(admin)
        db.session.commit()
        print("Default admin user created (admin / admin123)")
    else:
        admin = User.query.filter_by(username="admin").first()

    # Seed collectors if not existing
    collectors_data = [
        ("Kwame", "Mensah", "kwame_collector", "0244111222", "kwame@ecocycle.gh"),
        ("Abena", "Osei", "abena_collector", "0244333444", "abena@ecocycle.gh"),
        ("Kofi", "Addo", "kofi_collector", "0244555666", "kofi@ecocycle.gh"),
        ("Esi", "Dankwa", "esi_collector", "0244777888", "esi@ecocycle.gh")
    ]

    collectors = []
    for fname, lname, uname, phone, email in collectors_data:
        c = User.query.filter_by(username=uname).first()
        if not c:
            c = User(
                first_name=fname,
                last_name=lname,
                username=uname,
                phone=phone,
                email=email,
                password=generate_password_hash("collector123"),
                role="collector"
            )
            db.session.add(c)
            db.session.flush()
        collectors.append(c)

    # Seed citizens if not existing
    citizens_data = [
        ("Kojo", "Antwi", "kojo_citizen", "0201111222", "kojo@gmail.com", 240),
        ("Ama", "Tutu", "ama_citizen", "0202222333", "ama@gmail.com", 380),
        ("Yaw", "Boateng", "yaw_citizen", "0203333444", "yaw@gmail.com", 150),
        ("Akosua", "Manu", "akosua_citizen", "0204444555", "akosua@gmail.com", 490),
        ("Efia", "Appiah", "efia_citizen", "0205555666", "efia@gmail.com", 310),
        ("Kwaku", "Sarfo", "kwaku_citizen", "0206666777", "kwaku@gmail.com", 180)
    ]

    citizens = []
    for fname, lname, uname, phone, email, pts in citizens_data:
        cit = User.query.filter_by(username=uname).first()
        if not cit:
            cit = User(
                first_name=fname,
                last_name=lname,
                username=uname,
                phone=phone,
                email=email,
                password=generate_password_hash("citizen123"),
                role="citizen",
                reward_points=pts
            )
            db.session.add(cit)
            db.session.flush()
        citizens.append(cit)

    db.session.commit()

    # Seed Reward catalog if table is empty
    if Reward.query.count() == 0:
        print("Seeding initial Reward catalog into database...")
        default_rewards = [
            ("GH₵ 10 Mobile Money Airtime", 50, "Airtime", "Instant airtime top-up for MTN, Telecel, or AT mobile numbers."),
            ("GH₵ 20 High-Speed Mobile Data (2GB)", 80, "Data Bundle", "2GB high-speed internet data bundle for MTN, Telecel, or AT."),
            ("GH₵ 25 ECG Electricity Credit", 100, "Utilities", "Prepaid ECG electricity meter voucher token credit."),
            ("GH₵ 30 Ghana Water Bill Credit", 120, "Utilities", "Utility bill credit voucher for Ghana Water Company (GWCL) accounts."),
            ("GH₵ 40 Transport Fare Pass", 150, "Transport", "Voucher redeemable for Metro Mass bus & public transit fares."),
            ("GH₵ 50 Supermarket Shopping Voucher", 200, "Groceries", "Redeemable at Melcom, Palace, and partner supermarkets."),
            ("Silverbird Cinema Movie Ticket + Snack Combo", 250, "Entertainment", "1 Movie ticket with popcorn & drink at Silverbird Cinemas Ghana."),
            ("EcoCycle Ghana T-Shirt & Water Bottle", 300, "Eco Merchandise", "Official organic cotton EcoCycle T-shirt & stainless water bottle."),
            ("Student School Supplies Pack", 350, "Education", "Package with 10 exercise books, stationery kit, and school bag."),
            ("GH₵ 100 Family Restaurant Voucher", 450, "Dining", "Restaurant dining voucher valid at popular Ghanaian fast food spots.")
        ]

        for name, pts, cat, desc in default_rewards:
            rw = Reward(
                name=name,
                points=pts,
                category=cat,
                description=desc,
                is_active=True
            )
            db.session.add(rw)
        db.session.commit()
        print("Reward catalog seeded successfully!")

    # Check if we need to seed pickup requests
    existing_requests = PickupRequest.query.count()
    if existing_requests < 15:
        print("Seeding sample pickup requests and historical activity...")
        now = datetime.utcnow()
        locations = [
            "Accra Central, High Street",
            "East Legon, Boundary Road",
            "Madina Market, Zongo Junction",
            "Osu, Oxford Street",
            "Spintex Road, Coca-Cola Roundabout",
            "Kumasi, Adum Commercial Area",
            "Tema, Community 1 Market",
            "Takoradi, Market Circle",
            "Cape Coast, Pedu Junction",
            "Sunyani, Main Station Area"
        ]

        waste_types = ["Plastic", "Metal", "Paper", "Glass", "Rubber", "Waste"]

        # Seed data over the last 60 days
        for i in range(45):
            days_ago = random.randint(0, 56)
            req_date = now - timedelta(days=days_ago, hours=random.randint(1, 23))
            
            cit = random.choice(citizens)
            w_type = random.choice(waste_types)
            w_weight = round(random.uniform(2.5, 28.0), 1)
            loc = random.choice(locations)
            
            # Status distribution: 60% Collected, 25% Assigned, 15% Pending
            rand_val = random.random()
            if rand_val < 0.60:
                status = "Collected"
                collector = random.choice(collectors)
            elif rand_val < 0.85:
                status = "Assigned"
                collector = random.choice(collectors)
            else:
                status = "Pending"
                collector = None

            pr = PickupRequest(
                user_id=cit.id,
                waste_type=w_type,
                estimated_weight=w_weight,
                pickup_location=loc,
                status=status,
                collector_id=collector.id if collector else None,
                image_filename="sample_waste.jpg",
                created_at=req_date
            )
            db.session.add(pr)

        # Seed sample reward redemptions
        reward_options = [
            ("GH₵ 10 Mobile Money Airtime", 50),
            ("GH₵ 20 High-Speed Mobile Data (2GB)", 80),
            ("GH₵ 25 ECG Electricity Credit", 100),
            ("GH₵ 30 Ghana Water Bill Credit", 120),
            ("GH₵ 50 Supermarket Shopping Voucher", 200),
            ("EcoCycle Ghana T-Shirt & Water Bottle", 300)
        ]

        for i in range(18):
            days_ago = random.randint(0, 50)
            red_date = now - timedelta(days=days_ago)
            cit = random.choice(citizens)
            r_name, r_pts = random.choice(reward_options)
            code = f"ECO-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

            rr = RewardRedemption(
                user_id=cit.id,
                reward_name=r_name,
                points_spent=r_pts,
                redemption_code=code,
                created_at=red_date
            )
            db.session.add(rr)

        db.session.commit()
        print("Sample historical data seeded successfully!")
