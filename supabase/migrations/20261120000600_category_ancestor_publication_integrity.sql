CREATE OR REPLACE FUNCTION public.validate_category_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
    parent_level TEXT;
    expected_name TEXT;
    ancestors_are_published BOOLEAN;
    has_published_descendants BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.level = 'broad' THEN
            RAISE EXCEPTION
                'The six TrendPilot Broad Niches cannot be deleted.';
        END IF;

        RETURN OLD;
    END IF;

    IF NEW.parent_id IS NULL THEN
        IF NEW.level <> 'broad' THEN
            RAISE EXCEPTION
                'Top-level categories must be Broad Niches.';
        END IF;

        expected_name := CASE NEW.slug
            WHEN 'business' THEN 'Business'
            WHEN 'technology' THEN 'Technology'
            WHEN 'finance' THEN 'Finance'
            WHEN 'education' THEN 'Education'
            WHEN 'lifestyle' THEN 'Lifestyle'
            WHEN 'innovation' THEN 'Innovation'
            ELSE NULL
        END;

        IF expected_name IS NULL THEN
            RAISE EXCEPTION
                'Only the six approved TrendPilot Broad Niches are allowed at the top level.';
        END IF;

        IF NEW.name <> expected_name THEN
            RAISE EXCEPTION
                'The name of a Broad Niche must match its approved identity.';
        END IF;

        IF TG_OP = 'UPDATE'
           AND OLD.level = 'broad'
           AND (
               NEW.slug <> OLD.slug
               OR NEW.name <> OLD.name
               OR NEW.level <> OLD.level
           ) THEN
            RAISE EXCEPTION
                'The identity of a Broad Niche cannot be changed.';
        END IF;

    ELSE
        IF NEW.id = NEW.parent_id THEN
            RAISE EXCEPTION
                'A category cannot be its own parent.';
        END IF;

        SELECT level
        INTO parent_level
        FROM public.categories
        WHERE id = NEW.parent_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'The selected parent category does not exist.';
        END IF;

        IF NEW.level = 'subcategory'
           AND parent_level <> 'broad' THEN
            RAISE EXCEPTION
                'A subcategory must belong to a Broad Niche.';
        END IF;

        IF NEW.level = 'micro'
           AND parent_level <> 'subcategory' THEN
            RAISE EXCEPTION
                'A micro niche must belong to a subcategory.';
        END IF;

        IF NEW.level = 'broad' THEN
            RAISE EXCEPTION
                'Broad Niches cannot have a parent category.';
        END IF;

        IF NEW.status = 'published' THEN
            WITH RECURSIVE ancestors AS (
                SELECT
                    id,
                    parent_id,
                    level,
                    status
                FROM public.categories
                WHERE id = NEW.parent_id

                UNION ALL

                SELECT
                    parent.id,
                    parent.parent_id,
                    parent.level,
                    parent.status
                FROM public.categories AS parent
                INNER JOIN ancestors AS child
                    ON child.parent_id = parent.id
            )
            SELECT COALESCE(
                BOOL_AND(status = 'published')
                AND BOOL_OR(
                    parent_id IS NULL
                    AND level = 'broad'
                ),
                FALSE
            )
            INTO ancestors_are_published
            FROM ancestors;

            IF NOT ancestors_are_published THEN
                RAISE EXCEPTION
                    'A category can only be published when its entire parent hierarchy is published.';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.status = 'published'
       AND NEW.status <> 'published' THEN

        WITH RECURSIVE descendants AS (
            SELECT
                id,
                parent_id,
                status
            FROM public.categories
            WHERE parent_id = OLD.id

            UNION ALL

            SELECT
                child.id,
                child.parent_id,
                child.status
            FROM public.categories AS child
            INNER JOIN descendants AS parent
                ON child.parent_id = parent.id
        )
        SELECT EXISTS (
            SELECT 1
            FROM descendants
            WHERE status = 'published'
        )
        INTO has_published_descendants;

        IF has_published_descendants THEN
            RAISE EXCEPTION
                'Unpublish or archive all published descendants before changing this category status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_category_hierarchy()
FROM PUBLIC, anon, authenticated;


