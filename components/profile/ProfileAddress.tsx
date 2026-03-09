'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { MapPin, Pencil, Check, Trash2, Plus } from 'lucide-react';

interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface ProfileAddressProps {
  profileId: string;
  profileName: string;
}

const emptyAddress: AddressData = { street: '', city: '', state: '', zip: '' };

export function ProfileAddress({ profileId, profileName }: ProfileAddressProps) {
  const [address, setAddress] = useState<AddressData | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AddressData>(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchAddress = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile-addresses?profileId=${profileId}`);
      const data = await res.json();
      if (data.address) {
        setAddress({
          street: data.address.street,
          city: data.address.city,
          state: data.address.state,
          zip: data.address.zip,
        });
      } else {
        setAddress(null);
      }
    } catch {
      // silently fail
    } finally {
      setLoaded(true);
    }
  }, [profileId]);

  useEffect(() => { fetchAddress(); }, [fetchAddress]);

  const handleSave = async () => {
    if (!draft.street || !draft.city || !draft.state || !draft.zip) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile-addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, ...draft }),
      });
      if (res.ok) {
        setAddress(draft);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/profile-addresses?profileId=${profileId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAddress(null);
        setEditing(false);
        setDraft(emptyAddress);
      }
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setDraft(address || emptyAddress);
    setEditing(true);
  };

  const handlePlaceSelect = (parsed: { street: string; city: string; state: string; zip: string }) => {
    setDraft(parsed);
  };

  const firstName = profileName.split(' ')[0];
  const draftValid = draft.street && draft.city && draft.state && draft.zip;

  if (!loaded) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            Mailing Address
          </CardTitle>
          {!editing && address && (
            <button
              onClick={startEditing}
              className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <AddressAutocomplete
              value={draft.street}
              onChange={(v) => setDraft(d => ({ ...d, street: v }))}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Street address"
            />
            <div className="grid grid-cols-6 gap-2">
              <input
                type="text"
                value={draft.city}
                onChange={(e) => setDraft(d => ({ ...d, city: e.target.value }))}
                placeholder="City"
                className="col-span-3 h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <input
                type="text"
                value={draft.state}
                onChange={(e) => setDraft(d => ({ ...d, state: e.target.value }))}
                placeholder="State"
                maxLength={2}
                className="col-span-1 h-11 rounded-xl border border-gray-200 px-3 text-sm text-center uppercase focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <input
                type="text"
                value={draft.zip}
                onChange={(e) => setDraft(d => ({ ...d, zip: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                placeholder="ZIP"
                maxLength={5}
                className="col-span-2 h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={!draftValid || saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
              {address && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : address ? (
          <div className="text-sm text-gray-700">
            <p>{address.street}</p>
            <p>{address.city}, {address.state} {address.zip}</p>
          </div>
        ) : (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add mailing address for {firstName}
          </button>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Private &middot; Only visible to you
        </p>
      </CardContent>
    </Card>
  );
}
