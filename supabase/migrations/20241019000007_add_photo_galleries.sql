-- Add Photo Gallery Support (Multiple Photos)
-- Change single photo_url to photo_urls array for materials and expenses

-- Materials: Change photo_url to photo_urls (text array)
ALTER TABLE materials 
ADD COLUMN photo_urls text[] DEFAULT '{}';

-- Copy existing photo_url data to photo_urls array
UPDATE materials 
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Drop old photo_url column
ALTER TABLE materials 
DROP COLUMN photo_url;

-- Expenses: Change photo_url to photo_urls (text array)
ALTER TABLE expenses 
ADD COLUMN photo_urls text[] DEFAULT '{}';

-- Copy existing photo_url data to photo_urls array
UPDATE expenses 
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Drop old photo_url column
ALTER TABLE expenses 
DROP COLUMN photo_url;

-- Add check constraint: max 10 photos per entry
ALTER TABLE materials 
ADD CONSTRAINT materials_max_photos 
CHECK (array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 10);

ALTER TABLE expenses 
ADD CONSTRAINT expenses_max_photos 
CHECK (array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 10);

-- Add comment
COMMENT ON COLUMN materials.photo_urls IS 'Array of photo URLs (max 10)';
COMMENT ON COLUMN expenses.photo_urls IS 'Array of photo URLs (max 10)';

