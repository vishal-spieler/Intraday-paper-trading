// Mock implementation using localStorage

const createMockEntity = (name) => {
    const getStorageKey = () => `base44_${name}`;

    const getItems = () => {
        const items = localStorage.getItem(getStorageKey());
        return items ? JSON.parse(items) : [];
    };

    const saveItems = (items) => {
        localStorage.setItem(getStorageKey(), JSON.stringify(items));
    };

    return {
        list: async (sortParam) => {
            let items = getItems();
            // Basic sorting if needed
            if (sortParam && sortParam.startsWith('-')) {
                const field = sortParam.substring(1);
                items.sort((a, b) => (b[field] > a[field] ? 1 : -1));
            }
            return items;
        },
        create: async (data) => {
            const items = getItems();
            const newItem = { id: Date.now(), ...data, created_date: new Date().toISOString() };
            items.push(newItem);
            saveItems(items);
            return newItem;
        },
        update: async (id, data) => {
            const items = getItems();
            const index = items.findIndex(item => item.id === id);
            if (index !== -1) {
                items[index] = { ...items[index], ...data };
                saveItems(items);
                return items[index];
            }
            throw new Error("Item not found");
        },
        delete: async (id) => {
            const items = getItems();
            const newItems = items.filter(item => item.id !== id);
            saveItems(newItems);
            return { success: true };
        }
    };
};

export const base44 = {
    entities: {
        Wallet: createMockEntity('Wallet'),
        Trade: createMockEntity('Trade'),
    }
};
