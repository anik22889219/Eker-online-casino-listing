import { useState, useEffect } from "react";
import { CasinoRepository } from "../repositories/CasinoRepository";
import { Casino } from "../types/firestore";

export function useCasinos() {
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const casinoRepo = new CasinoRepository();

  const fetchCasinos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await casinoRepo.getPublishedCasinos();
      setCasinos(data);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch casino list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasinos();
  }, []);

  return {
    casinos,
    loading,
    error,
    refetch: fetchCasinos
  };
}

export default useCasinos;
