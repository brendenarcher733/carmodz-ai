# models/shop.py
# ZIP-based nearby automotive shop search — a location-search feature,
# deliberately separate from online-retailer links (frontend-only,
# lib/retailers.js). Stateless like models/guide.py: nothing here is ever
# persisted, no recommendation ID needed, works identically for an
# authenticated build or a never-saved anonymous preview.

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# US 5-digit ZIP, optionally ZIP+4 — same pattern the frontend has always
# validated against (components/ui/NearbyShopsPanel.jsx), enforced again
# here since this is the actual trust boundary now that a real backend call
# follows it.
_ZIP_RE = r"^\d{5}(-\d{4})?$"


class NearbyShopsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zip_code: str = Field(..., pattern=_ZIP_RE)
    # Reuses models.recommendation.ModRecommendation's category enum rather
    # than inventing a second one — see services/places_provider.py's
    # CATEGORY_TO_SHOP_BUCKET for how this becomes an actual shop-search
    # term. Optional: a bare ZIP search without a recommendation context
    # still makes sense and falls back to a general "auto repair" bucket.
    category: Optional[Literal["performance", "handling", "sound", "cosmetic", "reliability", "interior"]] = None

    @field_validator("zip_code")
    @classmethod
    def _strip_plus4(cls, v: str) -> str:
        # The 5-digit prefix is all a "shops near me" search needs — ZIP+4
        # adds precision this feature has no use for, so it's dropped
        # before the value goes anywhere (cache key, provider call, logs).
        return v.split("-")[0]


class NearbyShop(BaseModel):
    """Normalized shape every PlacesProvider implementation must produce —
    see services/places_provider.py. Every field the provider didn't supply
    stays None; nothing here is ever invented by application code."""
    name:            str
    category:        str
    address:         str
    distance_miles:  Optional[float] = Field(default=None, ge=0)
    phone:           Optional[str] = None
    rating:          Optional[float] = Field(default=None, ge=0, le=5)
    rating_count:    Optional[int] = Field(default=None, ge=0)
    hours_today:     Optional[str] = None
    latitude:        Optional[float] = None
    longitude:       Optional[float] = None


class NearbyShopsResponse(BaseModel):
    """`status` makes "not configured," "configured but found nothing," and
    "configured but the call failed" three distinct, honest states instead
    of collapsing them into an ambiguous empty list — see
    services/shop_discovery_service.py."""
    status:  Literal["ok", "not_configured", "no_results", "error"]
    shops:   list[NearbyShop] = []
    message: Optional[str] = None
