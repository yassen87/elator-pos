import axios from 'axios';

/**
 * Barcode Service - Handles external lookups for product barcodes
 */
export const barcodeService = {
    /**
     * Look up a barcode in Open Food Facts database
     * @param {string} barcode 
     * @returns {Promise<{success: boolean, data?: {name: string, category: string}, message?: string}>}
     */
    async lookupRemote(barcode) {
        if (!barcode || barcode.length < 8) {
            return { success: false, message: 'Invalid barcode length' };
        }

        try {
            console.log(`[BarcodeService] Looking up remote barcode: ${barcode}`);
            
            // Open Food Facts API is free and doesn't require a key for basic lookups
            const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
            const response = await axios.get(url, { timeout: 5000 });

            if (response.data && response.data.status === 1) {
                const product = response.data.product;
                
                // Extract useful data
                const result = {
                    name: product.product_name || product.product_name_ar || product.product_name_en || '',
                    category: 'product', // Default for external products
                    brand: product.brands || '',
                    image: product.image_url || null
                };

                // Try to map categories if possible (OFF categories are strings)
                // For now, keep it simple as 'product' since this is an oil/perfume shop
                // but we can refine this later if needed.

                console.log(`[BarcodeService] Found product: ${result.name}`);
                return { success: true, data: result };
            } else {
                console.log(`[BarcodeService] Product not found in Open Food Facts`);
                return { success: false, message: 'Product not found' };
            }
        } catch (error) {
            console.error('[BarcodeService] Remote lookup failed:', error.message);
            return { success: false, error: error.message };
        }
    }
};
