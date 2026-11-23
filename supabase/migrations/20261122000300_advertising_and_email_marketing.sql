-- =========================================================
-- TRENDPILOT: ADVERTISING AND EMAIL MARKETING
-- Migration: 20261122000300
-- =========================================================
-- Security principles:
-- - Admin/editor manage placements and advertising campaigns.
-- - Admin-only access to network configuration, advertiser
--   records, subscriber records, consent, delivery records,
--   and revenue.
-- - Provider secrets must remain in server-side environment
--   variables or a dedicated secrets manager.
-- - Promotional email consent and suppression are separate
--   from transactional account messaging.
-- =========================================================

-- ---------------------------------------------------------
-- 1. ROLE HELPER
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('admin', 'editor')
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_editor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_editor() TO authenticated;

-- ---------------------------------------------------------
-- 2. AD NETWORK CONNECTIONS
-- ---------------------------------------------------------
-- Store non-secret account metadata only. Never store API
-- keys, OAuth refresh tokens, or provider secrets here.

CREATE TABLE public.ad_network_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    account_label TEXT NOT NULL,
    external_account_id TEXT,
    publisher_id TEXT,
    status TEXT NOT NULL DEFAULT 'not_configured'
        CHECK (status IN (
            'not_configured',
            'pending',
            'connected',
            'paused',
            'disconnected',
            'error'
        )),
    last_synced_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ad_network_provider_not_empty
        CHECK (LENGTH(BTRIM(provider)) > 0),
    CONSTRAINT ad_network_label_not_empty
        CHECK (LENGTH(BTRIM(account_label)) > 0)
);

CREATE UNIQUE INDEX ad_network_provider_account_unique
ON public.ad_network_connections (
    LOWER(provider),
    external_account_id
)
WHERE external_account_id IS NOT NULL;

CREATE INDEX ad_network_connections_status_idx
ON public.ad_network_connections (status);

CREATE TRIGGER ad_network_connections_set_updated_at
BEFORE UPDATE ON public.ad_network_connections
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.ad_network_connections IS
    'Non-secret metadata for connected advertising networks. Credentials must remain outside this table.';

-- ---------------------------------------------------------
-- 3. AD PLACEMENTS
-- ---------------------------------------------------------

CREATE TABLE public.ad_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    placement_key TEXT NOT NULL UNIQUE,
    description TEXT,
    page_scope TEXT NOT NULL DEFAULT 'sitewide'
        CHECK (page_scope IN (
            'sitewide',
            'homepage',
            'article',
            'category',
            'search',
            'other'
        )),
    position TEXT NOT NULL
        CHECK (position IN (
            'header',
            'sidebar',
            'in_content',
            'article_top',
            'article_bottom',
            'footer',
            'feed',
            'custom'
        )),
    format TEXT NOT NULL DEFAULT 'responsive'
        CHECK (format IN (
            'responsive',
            'display',
            'native',
            'banner',
            'in_feed',
            'custom'
        )),
    status TEXT NOT NULL DEFAULT 'inactive'
        CHECK (status IN ('active', 'inactive', 'archived')),
    dimensions JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (JSONB_TYPEOF(dimensions) = 'object'),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ad_placements_name_not_empty
        CHECK (LENGTH(BTRIM(name)) > 0),
    CONSTRAINT ad_placements_key_format
        CHECK (placement_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$')
);

CREATE INDEX ad_placements_status_scope_idx
ON public.ad_placements (status, page_scope);

CREATE TRIGGER ad_placements_set_updated_at
BEFORE UPDATE ON public.ad_placements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 4. ADVERTISERS
-- ---------------------------------------------------------
-- Contact details and commercial information are admin-only.

CREATE TABLE public.advertisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    website_url TEXT,
    billing_address TEXT,
    tax_reference TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'prospect'
        CHECK (status IN (
            'prospect',
            'active',
            'inactive',
            'blacklisted'
        )),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT advertisers_company_name_not_empty
        CHECK (LENGTH(BTRIM(company_name)) > 0),
    CONSTRAINT advertisers_contact_email_format
        CHECK (
            contact_email IS NULL
            OR contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
        )
);

CREATE INDEX advertisers_status_created_idx
ON public.advertisers (status, created_at DESC);

CREATE INDEX advertisers_company_name_idx
ON public.advertisers (LOWER(company_name));

CREATE TRIGGER advertisers_set_updated_at
BEFORE UPDATE ON public.advertisers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 5. ADVERTISING CAMPAIGNS
-- ---------------------------------------------------------

CREATE TABLE public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID REFERENCES public.advertisers(id) ON DELETE SET NULL,
    network_connection_id UUID
        REFERENCES public.ad_network_connections(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    campaign_type TEXT NOT NULL
        CHECK (campaign_type IN (
            'network',
            'direct',
            'sponsored',
            'house'
        )),
    channel TEXT NOT NULL
        CHECK (channel IN (
            'display',
            'native',
            'sponsored_content',
            'email',
            'other'
        )),
    objective TEXT,
    destination_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'pending_review',
            'scheduled',
            'active',
            'paused',
            'completed',
            'rejected',
            'archived'
        )),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ad_campaigns_name_not_empty
        CHECK (LENGTH(BTRIM(name)) > 0),
    CONSTRAINT ad_campaigns_date_order
        CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX ad_campaigns_status_dates_idx
ON public.ad_campaigns (status, starts_at, ends_at);

CREATE INDEX ad_campaigns_advertiser_idx
ON public.ad_campaigns (advertiser_id);

CREATE INDEX ad_campaigns_network_connection_idx
ON public.ad_campaigns (network_connection_id);

CREATE INDEX ad_campaigns_channel_status_idx
ON public.ad_campaigns (channel, status);

CREATE TRIGGER ad_campaigns_set_updated_at
BEFORE UPDATE ON public.ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 6. CAMPAIGN PLACEMENTS
-- ---------------------------------------------------------

CREATE TABLE public.ad_campaign_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL
        REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    placement_id UUID NOT NULL
        REFERENCES public.ad_placements(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ad_campaign_placements_unique
        UNIQUE (campaign_id, placement_id)
);

CREATE INDEX ad_campaign_placements_placement_idx
ON public.ad_campaign_placements (placement_id);

-- ---------------------------------------------------------
-- 7. SPONSORED CONTENT
-- ---------------------------------------------------------

CREATE TABLE public.sponsored_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL
        REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    article_id UUID NOT NULL
        REFERENCES public.articles(id) ON DELETE CASCADE,
    disclosure_label TEXT NOT NULL DEFAULT 'Sponsored',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'pending_review',
            'approved',
            'published',
            'paused',
            'archived'
        )),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sponsored_content_article_unique UNIQUE (article_id),
    CONSTRAINT sponsored_content_disclosure_not_empty
        CHECK (LENGTH(BTRIM(disclosure_label)) > 0),
    CONSTRAINT sponsored_content_date_order
        CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX sponsored_content_campaign_status_idx
ON public.sponsored_content (campaign_id, status);

CREATE TRIGGER sponsored_content_set_updated_at
BEFORE UPDATE ON public.sponsored_content
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 8. EMAIL SUBSCRIBERS
-- ---------------------------------------------------------
-- Subscriber personal data is admin-only.
-- Subscription must be consent-based.

CREATE TABLE public.email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'subscribed',
            'unsubscribed',
            'suppressed'
        )),
    consent_source TEXT,
    consent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_subscribers_email_not_empty
        CHECK (LENGTH(BTRIM(email)) > 0),
    CONSTRAINT email_subscribers_email_format
        CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
    CONSTRAINT email_subscribers_consent_required
        CHECK (
            status <> 'subscribed'
            OR (consent_at IS NOT NULL AND confirmed_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX email_subscribers_email_unique
ON public.email_subscribers (LOWER(BTRIM(email)));

CREATE INDEX email_subscribers_status_created_idx
ON public.email_subscribers (status, created_at DESC);

CREATE TRIGGER email_subscribers_set_updated_at
BEFORE UPDATE ON public.email_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 9. EMAIL CONSENT HISTORY
-- ---------------------------------------------------------
-- Preserve consent changes as an auditable event history.

CREATE TABLE public.email_consent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL
        REFERENCES public.email_subscribers(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'consent_granted',
            'consent_confirmed',
            'consent_withdrawn',
            'consent_reconfirmed'
        )),
    consent_source TEXT,
    policy_version TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_consent_events_subscriber_date_idx
ON public.email_consent_events (subscriber_id, recorded_at DESC);

-- ---------------------------------------------------------
-- 10. EMAIL SUPPRESSION LIST
-- ---------------------------------------------------------
-- Suppressed addresses must never receive promotional sends.

CREATE TABLE public.email_suppressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    reason TEXT NOT NULL
        CHECK (reason IN (
            'unsubscribe',
            'hard_bounce',
            'spam_complaint',
            'manual',
            'invalid_address',
            'other'
        )),
    source TEXT,
    suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_suppressions_email_not_empty
        CHECK (LENGTH(BTRIM(email)) > 0)
);

CREATE UNIQUE INDEX email_suppressions_email_unique
ON public.email_suppressions (LOWER(BTRIM(email)));

-- Private, single-use unsubscribe tokens.
-- Store only a SHA-256 hash; never persist the raw token.

CREATE TABLE public.email_unsubscribe_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL
        REFERENCES public.email_subscribers(id) ON DELETE RESTRICT,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_unsubscribe_token_hash_format
        CHECK (token_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX email_unsubscribe_tokens_subscriber_idx
ON public.email_unsubscribe_tokens (subscriber_id, created_at DESC);

-- ---------------------------------------------------------
-- 11. EMAIL CAMPAIGNS
-- ---------------------------------------------------------
-- Campaign content is separate from subscriber records.

CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    preview_text TEXT,
    from_name TEXT,
    reply_to_email TEXT,
    html_content TEXT,
    text_content TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'pending_review',
            'scheduled',
            'sending',
            'sent',
            'paused',
            'cancelled',
            'failed'
        )),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_campaigns_name_not_empty
        CHECK (LENGTH(BTRIM(name)) > 0),
    CONSTRAINT email_campaigns_subject_not_empty
        CHECK (LENGTH(BTRIM(subject)) > 0),
    CONSTRAINT email_campaigns_reply_to_format
        CHECK (
            reply_to_email IS NULL
            OR reply_to_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
        )
);

CREATE INDEX email_campaigns_status_schedule_idx
ON public.email_campaigns (status, scheduled_at);

CREATE TRIGGER email_campaigns_set_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 12. EMAIL CAMPAIGN DELIVERIES
-- ---------------------------------------------------------
-- No raw provider credentials or unnecessary message content.

CREATE TABLE public.email_campaign_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL
        REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    subscriber_id UUID NOT NULL
        REFERENCES public.email_subscribers(id) ON DELETE RESTRICT,
    provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN (
            'queued',
            'sent',
            'delivered',
            'opened',
            'clicked',
            'bounced',
            'complained',
            'failed',
            'suppressed'
        )),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_campaign_delivery_unique
        UNIQUE (campaign_id, subscriber_id)
);

CREATE INDEX email_deliveries_campaign_status_idx
ON public.email_campaign_deliveries (campaign_id, status);

CREATE INDEX email_deliveries_subscriber_idx
ON public.email_campaign_deliveries (subscriber_id, created_at DESC);

CREATE TRIGGER email_campaign_deliveries_set_updated_at
BEFORE UPDATE ON public.email_campaign_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 13. DAILY ADVERTISING METRICS
-- ---------------------------------------------------------
-- Aggregated metrics only; event ingestion is server-side.

CREATE TABLE public.advertising_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    channel TEXT NOT NULL
        CHECK (channel IN (
            'display',
            'native',
            'sponsored_content',
            'email',
            'affiliate',
            'other'
        )),
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
    placement_id UUID REFERENCES public.ad_placements(id) ON DELETE SET NULL,
    network_connection_id UUID
        REFERENCES public.ad_network_connections(id) ON DELETE SET NULL,
    impressions BIGINT NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    clicks BIGINT NOT NULL DEFAULT 0 CHECK (clicks >= 0),
    conversions BIGINT NOT NULL DEFAULT 0 CHECK (conversions >= 0),
    revenue_amount NUMERIC(20, 6) NOT NULL DEFAULT 0
        CHECK (revenue_amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD'
        CHECK (currency ~ '^[A-Z]{3}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX advertising_metrics_date_channel_idx
ON public.advertising_daily_metrics (metric_date DESC, channel);

CREATE INDEX advertising_metrics_campaign_date_idx
ON public.advertising_daily_metrics (campaign_id, metric_date DESC);

CREATE UNIQUE INDEX advertising_daily_metrics_dimension_unique
ON public.advertising_daily_metrics (
    metric_date,
    channel,
    campaign_id,
    placement_id,
    network_connection_id,
    currency
) NULLS NOT DISTINCT;

-- ---------------------------------------------------------
-- 14. MONETIZATION REVENUE
-- ---------------------------------------------------------
-- Financial records are admin-only. Keep estimated network
-- revenue distinct from confirmed direct advertiser payments.

CREATE TABLE public.monetization_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL
        CHECK (source_type IN (
            'ad_network',
            'direct_advertiser',
            'sponsored_content',
            'email_campaign',
            'affiliate',
            'other'
        )),
    network_connection_id UUID
        REFERENCES public.ad_network_connections(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
    advertiser_id UUID REFERENCES public.advertisers(id) ON DELETE SET NULL,
    revenue_status TEXT NOT NULL DEFAULT 'estimated'
        CHECK (revenue_status IN (
            'estimated',
            'pending',
            'confirmed',
            'paid',
            'reversed'
        )),
    amount NUMERIC(20, 6) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD'
        CHECK (currency ~ '^[A-Z]{3}$'),
    revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX monetization_revenue_date_status_idx
ON public.monetization_revenue (revenue_date DESC, revenue_status);

CREATE INDEX monetization_revenue_source_idx
ON public.monetization_revenue (source_type, revenue_date DESC);

CREATE TRIGGER monetization_revenue_set_updated_at
BEFORE UPDATE ON public.monetization_revenue
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 15. ROW LEVEL SECURITY
-- ---------------------------------------------------------

ALTER TABLE public.ad_network_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaign_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsored_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertising_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_revenue ENABLE ROW LEVEL SECURITY;

-- Admin-only records.

CREATE POLICY ad_network_connections_admin_all
ON public.ad_network_connections
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY advertisers_admin_all
ON public.advertisers
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY email_subscribers_admin_all
ON public.email_subscribers
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY email_consent_events_admin_all
ON public.email_consent_events
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY email_suppressions_admin_all
ON public.email_suppressions
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY email_campaign_deliveries_admin_all
ON public.email_campaign_deliveries
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY monetization_revenue_admin_all
ON public.monetization_revenue
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Admin/editor operational records.

CREATE POLICY ad_placements_admin_editor_all
ON public.ad_placements
FOR ALL TO authenticated
USING ((SELECT public.is_admin_or_editor()))
WITH CHECK ((SELECT public.is_admin_or_editor()));

CREATE POLICY ad_campaigns_admin_editor_all
ON public.ad_campaigns
FOR ALL TO authenticated
USING ((SELECT public.is_admin_or_editor()))
WITH CHECK ((SELECT public.is_admin_or_editor()));

CREATE POLICY ad_campaign_placements_admin_editor_all
ON public.ad_campaign_placements
FOR ALL TO authenticated
USING ((SELECT public.is_admin_or_editor()))
WITH CHECK ((SELECT public.is_admin_or_editor()));

CREATE POLICY sponsored_content_admin_editor_all
ON public.sponsored_content
FOR ALL TO authenticated
USING ((SELECT public.is_admin_or_editor()))
WITH CHECK ((SELECT public.is_admin_or_editor()));

CREATE POLICY email_campaigns_admin_editor_all
ON public.email_campaigns
FOR ALL TO authenticated
USING ((SELECT public.is_admin_or_editor()))
WITH CHECK ((SELECT public.is_admin_or_editor()));

CREATE POLICY advertising_metrics_admin_editor_read
ON public.advertising_daily_metrics
FOR SELECT TO authenticated
USING ((SELECT public.is_admin_or_editor()));

-- ---------------------------------------------------------
-- 16. EXPLICIT TABLE PRIVILEGES
-- ---------------------------------------------------------

REVOKE ALL ON
    public.ad_network_connections,
    public.ad_placements,
    public.advertisers,
    public.ad_campaigns,
    public.ad_campaign_placements,
    public.sponsored_content,
    public.email_subscribers,
    public.email_consent_events,
    public.email_suppressions,
    public.email_unsubscribe_tokens,
    public.email_campaigns,
    public.email_campaign_deliveries,
    public.advertising_daily_metrics,
    public.monetization_revenue
FROM PUBLIC, anon, authenticated;

-- Admin/editor operational tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.ad_placements,
    public.ad_campaigns,
    public.ad_campaign_placements,
    public.sponsored_content,
    public.email_campaigns
TO authenticated;

-- Admin-only tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.ad_network_connections,
    public.advertisers,
    public.email_subscribers,
    public.email_consent_events,
    public.email_suppressions,
    public.email_campaign_deliveries,
    public.monetization_revenue
TO authenticated;

-- Aggregated metrics are readable by admin/editor.
-- Writes are reserved for trusted server-side ingestion.
GRANT SELECT ON public.advertising_daily_metrics TO authenticated;

-- Service role performs trusted ingestion and provider workflows.
GRANT ALL ON
    public.ad_network_connections,
    public.ad_placements,
    public.advertisers,
    public.ad_campaigns,
    public.ad_campaign_placements,
    public.sponsored_content,
    public.email_subscribers,
    public.email_consent_events,
    public.email_suppressions,
    public.email_unsubscribe_tokens,
    public.email_campaigns,
    public.email_campaign_deliveries,
    public.advertising_daily_metrics,
    public.monetization_revenue
TO service_role;

COMMENT ON TABLE public.email_subscribers IS
    'Promotional email audience. Subscription requires recorded consent; transactional messages are managed separately.';

COMMENT ON TABLE public.email_suppressions IS
    'Addresses excluded from promotional email delivery, including unsubscribes, complaints, and hard bounces.';
COMMENT ON TABLE public.email_unsubscribe_tokens IS
    'Private hashed single-use unsubscribe tokens. Raw tokens must never be stored or exposed.';

COMMENT ON TABLE public.monetization_revenue IS
    'Admin-only revenue ledger separating estimated network earnings from confirmed and paid revenue.';

COMMENT ON TABLE public.advertising_daily_metrics IS
    'Server-ingested aggregated advertising performance metrics. Authenticated clients have read-only access through RLS.';

-- =========================================================
-- END MIGRATION
-- =========================================================



