# services/vehicle_waitlist_service.py
# "My vehicle isn't listed" — a plain capture, nothing else. No email is
# sent here (unlike services/plan_email_service.py): "we'll notify you
# when we add it" is a future, manual action by whoever reviews this list,
# not an automated send at submission time.

from sqlalchemy.orm import Session

from models.vehicle_waitlist import VehicleWaitlistCapture, VehicleWaitlistRequest


def submit_vehicle_waitlist(db: Session, data: VehicleWaitlistRequest) -> VehicleWaitlistCapture:
    capture = VehicleWaitlistCapture(email=data.email, make=data.make, model=data.model)
    db.add(capture)
    db.commit()
    db.refresh(capture)
    return capture
