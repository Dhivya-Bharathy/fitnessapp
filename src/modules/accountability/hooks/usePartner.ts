import { useState, useCallback, useRef, useEffect } from 'react';
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
  const hasLoadedOnce = useRef(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    hasLoadedOnce.current = false;
    setPartners([]);
    setIsLoading(!!userId);
  }, [userId]);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) return;
      const silent = options?.silent ?? hasLoadedOnce.current;
      if (!silent) setIsLoading(true);
      const forUserId = userId;
      const data = await loadPartners(forUserId);
      if (forUserId !== userIdRef.current) return;
      setPartners(data);
      hasLoadedOnce.current = true;
      setIsLoading(false);
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      if (userId) void load({ silent: hasLoadedOnce.current });
    }, [userId, load])
  );

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