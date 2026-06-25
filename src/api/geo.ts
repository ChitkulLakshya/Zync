import { API_BASE_URL } from '../lib/utils';
import { auth } from '../lib/firebase';

export interface GeoData {
    timezone: string | null;
    country: string | null;
    countryCode: string | null;
    city: string | null;
}

export const detectLocation = async (): Promise<GeoData | null> => {
    const user = auth.currentUser;
    if (!user) { return null; }

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE_URL}/api/users/detect-location`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) { return null; }
    return res.json();
};
