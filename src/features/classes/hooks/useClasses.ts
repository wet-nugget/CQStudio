import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
export function useClasses() {
    return useQuery({ queryKey: ['classes'], queryFn: async () => {
            const { data, error } = await db().from('classes').select('*').order('name').limit(100);
            if (error)
                throw new Error('Could not load classes.');
            return data;
        } });
}
export function useClass(id?: string) {
    return useQuery({ queryKey: ['class', id], enabled: Boolean(id), queryFn: async () => {
            const { data, error } = await db().from('classes').select('*').eq('id', id!).single();
            if (error)
                throw new Error('Class unavailable.');
            return data;
        } });
}
