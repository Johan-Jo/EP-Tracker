-- EP Time Tracker - Seed Data for Pilot Organization
-- Phase 1 MVP: Default data and public checklist templates
-- Author: EP Tracker Team
-- Date: 2025-10-18

-- ============================================================================
-- PUBLIC CHECKLIST TEMPLATES (Swedish Construction Standards)
-- ============================================================================

-- Riskanalys (Risk Analysis) Template
INSERT INTO checklist_templates (id, org_id, name, description, category, is_public, template_data, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Riskanalys',
    'Standardmall för riskanalys på byggarbetsplats enligt AFS 2001:1',
    'safety',
    TRUE,
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object(
                'title', 'Allmän information',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Projekt', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Plats', 'required', true),
                    jsonb_build_object('type', 'date', 'label', 'Datum', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Utförd av', 'required', true)
                )
            ),
            jsonb_build_object(
                'title', 'Identifierade risker',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Fall från höjd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Fallande föremål'),
                    jsonb_build_object('type', 'checkbox', 'label', 'El-risker'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Brand/explosion'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Kemikalier'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Buller'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Damm'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Vibrationer'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Tunga lyft'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Maskiner/verktyg'),
                    jsonb_build_object('type', 'text', 'label', 'Övriga risker (specificera)', 'multiline', true)
                )
            ),
            jsonb_build_object(
                'title', 'Åtgärder',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Risk 1 - Åtgärd', 'multiline', true),
                    jsonb_build_object('type', 'text', 'label', 'Risk 2 - Åtgärd', 'multiline', true),
                    jsonb_build_object('type', 'text', 'label', 'Risk 3 - Åtgärd', 'multiline', true),
                    jsonb_build_object('type', 'text', 'label', 'Övriga åtgärder', 'multiline', true)
                )
            ),
            jsonb_build_object(
                'title', 'Uppföljning',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Åtgärder genomförda'),
                    jsonb_build_object('type', 'date', 'label', 'Uppföljningsdatum'),
                    jsonb_build_object('type', 'text', 'label', 'Ansvarig för uppföljning')
                )
            )
        )
    ),
    NOW(),
    NOW()
);

-- Egenkontroll Målning (Self-Inspection Painting) Template
INSERT INTO checklist_templates (id, org_id, name, description, category, is_public, template_data, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Egenkontroll Målning',
    'Kontrollmall för målningsarbete enligt AMA Hus',
    'quality',
    TRUE,
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object(
                'title', 'Projekt & Plats',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Projekt', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Rum/Utrymme', 'required', true),
                    jsonb_build_object('type', 'date', 'label', 'Datum', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Kontrollant', 'required', true)
                )
            ),
            jsonb_build_object(
                'title', 'Förberedelser',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Underlag rengjort'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Underlag torrt'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Temperatur >10°C'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Luftfuktighet <80%'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Grundning applicerad'),
                    jsonb_build_object('type', 'text', 'label', 'Produkter (typ och kulör)', 'multiline', true)
                )
            ),
            jsonb_build_object(
                'title', 'Utförande',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Täckning av ytor OK'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Inga rinnmärken'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Jämn ytfinish'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Antal strykningar enligt spec'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Torktider följda'),
                    jsonb_build_object('type', 'photo', 'label', 'Foto på utfört arbete')
                )
            ),
            jsonb_build_object(
                'title', 'Slutkontroll',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Kulör godkänd av beställare'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Inga defekter'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Städning utförd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Arbetet godkänt'),
                    jsonb_build_object('type', 'text', 'label', 'Kommentarer', 'multiline', true)
                )
            )
        )
    ),
    NOW(),
    NOW()
);

-- Egenkontroll Golv (Self-Inspection Flooring) Template
INSERT INTO checklist_templates (id, org_id, name, description, category, is_public, template_data, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Egenkontroll Golv',
    'Kontrollmall för golvläggning enligt AMA Hus',
    'quality',
    TRUE,
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object(
                'title', 'Projekt & Plats',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Projekt', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Rum/Utrymme', 'required', true),
                    jsonb_build_object('type', 'date', 'label', 'Datum', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Kontrollant', 'required', true)
                )
            ),
            jsonb_build_object(
                'title', 'Undergolv',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Undergolv rent och torrt'),
                    jsonb_build_object('type', 'checkbox', 'label', 'RF-mätning utförd'),
                    jsonb_build_object('type', 'text', 'label', 'RF-värde (%)'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Planhet kontrollerad'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Sprickor åtgärdade'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Grundning applicerad')
                )
            ),
            jsonb_build_object(
                'title', 'Golvläggning',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Golvmaterial (typ och artikelnr)'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Material lagrat enligt tillverkarens anvisningar'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Temperatur 18-25°C'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Luftfuktighet 30-60%'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Lim/metod enligt spec'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Fogar raka och jämna'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Sockel monterad'),
                    jsonb_build_object('type', 'photo', 'label', 'Foto på utfört arbete')
                )
            ),
            jsonb_build_object(
                'title', 'Slutkontroll',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Ingen buktning eller vågor'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Inga synliga skarvar'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Städning utförd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Arbetet godkänt'),
                    jsonb_build_object('type', 'text', 'label', 'Kommentarer', 'multiline', true)
                )
            )
        )
    ),
    NOW(),
    NOW()
);

-- Skyddskontroll enligt AFS (Protection Control) Template
INSERT INTO checklist_templates (id, org_id, name, description, category, is_public, template_data, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Skyddskontroll AFS',
    'Kontroll av skydd och säkerhetsåtgärder enligt AFS 1999:3',
    'safety',
    TRUE,
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object(
                'title', 'Allmänt',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Projekt', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Plats', 'required', true),
                    jsonb_build_object('type', 'date', 'label', 'Datum', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Kontrollant', 'required', true)
                )
            ),
            jsonb_build_object(
                'title', 'Personlig Skyddsutrustning',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Hjälm'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Skyddsglasögon'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Hörselskydd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Andningsskydd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Skyddshandskar'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Säkerhetsskor'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Varselkläder')
                )
            ),
            jsonb_build_object(
                'title', 'Arbetsmiljö',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Räcken och skyddsräcken'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Fallskyddsutrustning'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Brandsläckare tillgänglig'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Nödutgångar fria'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Belysning tillräcklig'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Ventilation fungerar'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Första hjälpen utrustning'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Skyltar och varningar uppsatta')
                )
            ),
            jsonb_build_object(
                'title', 'Verktyg & Maskiner',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Elverktyg jordfelsbrytare'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Skyddskåpor på plats'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Verktyg i gott skick'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Stegar säkra'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Ställningar godkända')
                )
            ),
            jsonb_build_object(
                'title', 'Dokumentation',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Riskanalys genomförd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Arbetsbeskrivning finns'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Säkerhetsdatablad tillgängliga'),
                    jsonb_build_object('type', 'photo', 'label', 'Foto på arbetsplatsen'),
                    jsonb_build_object('type', 'text', 'label', 'Avvikelser och åtgärder', 'multiline', true)
                )
            )
        )
    ),
    NOW(),
    NOW()
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE checklist_templates IS 'Includes public Swedish construction standard templates';
