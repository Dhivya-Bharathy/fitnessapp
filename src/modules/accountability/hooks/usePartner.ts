import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  loadPartners,
  addPartner,
  removePartner,
  PartnerData,
} from '../services/PartnerService';

export function usePartner(userId: string) {
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId) load();
    }, [userId])
  );

  const load = async () => {
    setIsLoading(true);
    const data = await loadPartners(userId);
    setPartners(data);
    setIsLoading(false);
  };

  const add = async (
    calfitId: string
  ): Promise<{ success: boolean; message: string }> => {
    setIsAdding(true);
    const result = await addPartner(userId, calfitId);
    if (result.success) await load();
    setIsAdding(false);
    return result;
  };

  const remove = async (partnerId: string): Promise<void> => {
    await removePartner(userId, partnerId);
    setPartners((prev) => prev.filter((p) => p && p.partner_id !== partnerId));
  };

  return { partners, isLoading, isAdding, add, remove, reload: load };
}