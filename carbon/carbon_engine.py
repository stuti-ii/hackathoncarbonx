def calculate_carbon(platform, duration):
    rates = {
        "youtube": 0.02,
        "netflix": 0.05,
        "instagram": 0.01,
        "facebook": 0.015,
        "default": 0.02
    }

    return rates.get(platform.lower(), rates["default"]) * duration