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
    '{
        "sections": [
            {
                "title": "Allmän information",
                "items": [
                    {"type": "text", "label": "Projekt", "required": true},
                    {"type": "text", "label": "Plats", "required": true},
                    {"type": "date", "label": "Datum", "required": true},
                    {"type": "text", "label": "Utförd av", "required": true}
                ]
            },
            {
                "title": "Identifierade risker",
                "items": [
                    {"type": "checkbox", "label": "Fall från höjd"},
                    {"type": "checkbox", "label": "Fallande föremål"},
                    {"type": "checkbox", "label": "El-risker"},
                    {"type": "checkbox", "label": "Brand/explosion"},
                    {"type": "checkbox", "label": "Kemikalier"},
                    {"type": "checkbox", "label": "Buller"},
                    {"type": "checkbox", "label": "Damm"},
                    {"type": "checkbox", "label": "Vibrationer"},
                    {"type": "checkbox", "label": "Tunga lyft"},
                    {"type": "checkbox", "label": "Maskiner/verktyg"},
                    {"type": "text", "label": "Övriga risker (specificera)", "multiline": true}
                ]
            },
            {
                "title": "Åtgärder",
                "items": [
                    {"type": "text", "label": "Risk 1 - Åtgärd", "multiline": true},
                    {"type": "text", "label": "Risk 2 - Åtgärd", "multiline": true},
                    {"type": "text", "label": "Risk 3 - Åtgärd", "multiline": true},
                    {"type": "text", "label": "Övriga åtgärder", "multiline": true}
                ]
            },
            {
                "title": "Uppföljning",
                "items": [
                    {"type": "checkbox", "label": "Åtgärder genomförda"},
                    {"type": "date", "label": "Uppföljningsdatum"},
                    {"type": "text", "label": "Ansvarig för uppföljning"}
                ]
            }
        ]
    }'::jsonb,
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
    '{
        "sections": [
            {
                "title": "Projekt & Plats",
                "items": [
                    {"type": "text", "label": "Projekt", "required": true},
                    {"type": "text", "label": "Rum/Utrymme", "required": true},
                    {"type": "date", "label": "Datum", "required": true},
                    {"type": "text", "label": "Kontrollant", "required": true}
                ]
            },
            {
                "title": "Förberedelser",
                "items": [
                    {"type": "checkbox", "label": "Underlag rengjort"},
                    {"type": "checkbox", "label": "Underlag torrt"},
                    {"type": "checkbox", "label": "Temperatur >10°C"},
                    {"type": "checkbox", "label": "Luftfuktighet <80%"},
                    {"type": "checkbox", "label": "Grundning applicerad"},
                    {"type": "text", "label": "Produkter (typ och kulör)", "multiline": true}
                ]
            },
            {
                "title": "Utförande",
                "items": [
                    {"type": "checkbox", "label": "Täckning av ytor OK"},
                    {"type": "checkbox", "label": "Inga rinnmärken"},
                    {"type": "checkbox", "label": "Jämn ytfinish"},
                    {"type": "checkbox", "label": "Antal strykningar enligt spec"},
                    {"type": "checkbox", "label": "Torktider följda"},
                    {"type": "photo", "label": "Foto på utfört arbete"}
                ]
            },
            {
                "title": "Slutkontroll",
                "items": [
                    {"type": "checkbox", "label": "Kulör godkänd av beställare"},
                    {"type": "checkbox", "label": "Inga defekter"},
                    {"type": "checkbox", "label": "Städning utförd"},
                    {"type": "checkbox", "label": "Arbetet godkänt"},
                    {"type": "text", "label": "Kommentarer", "multiline": true}
                ]
            }
        ]
    }'::jsonb,
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
    '{
        "sections": [
            {
                "title": "Projekt & Plats",
                "items": [
                    {"type": "text", "label": "Projekt", "required": true},
                    {"type": "text", "label": "Rum/Utrymme", "required": true},
                    {"type": "date", "label": "Datum", "required": true},
                    {"type": "text", "label": "Kontrollant", "required": true}
                ]
            },
            {
                "title": "Undergolv",
                "items": [
                    {"type": "checkbox", "label": "Undergolv rent och torrt"},
                    {"type": "checkbox", "label": "RF-mätning utförd"},
                    {"type": "text", "label": "RF-värde (%)"},
                    {"type": "checkbox", "label": "Planhet kontrollerad"},
                    {"type": "checkbox", "label": "Sprickor åtgärdade"},
                    {"type": "checkbox", "label": "Grundning applicerad"}
                ]
            },
            {
                "title": "Golvläggning",
                "items": [
                    {"type": "text", "label": "Golvmaterial (typ och artikelnr)"},
                    {"type": "checkbox", "label": "Material lagrat enligt tillverkarens anvisningar"},
                    {"type": "checkbox", "label": "Temperatur 18-25°C"},
                    {"type": "checkbox", "label": "Luftfuktighet 30-60%"},
                    {"type": "checkbox", "label": "Lim/metod enligt spec"},
                    {"type": "checkbox", "label": "Fogar raka och jämna"},
                    {"type": "checkbox", "label": "Sockel monterad"},
                    {"type": "photo", "label": "Foto på utfört arbete"}
                ]
            },
            {
                "title": "Slutkontroll",
                "items": [
                    {"type": "checkbox", "label": "Ingen buktning eller vågor"},
                    {"type": "checkbox", "label": "Inga synliga skarvar"},
                    {"type": "checkbox", "label": "Städning utförd"},
                    {"type": "checkbox", "label": "Arbetet godkänt"},
                    {"type": "text", "label": "Kommentarer", "multiline": true}
                ]
            }
        ]
    }'::jsonb,
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
    '{
        "sections": [
            {
                "title": "Allmänt",
                "items": [
                    {"type": "text", "label": "Projekt", "required": true},
                    {"type": "text", "label": "Plats", "required": true},
                    {"type": "date", "label": "Datum", "required": true},
                    {"type": "text", "label": "Kontrollant", "required": true}
                ]
            },
            {
                "title": "Personlig Skyddsutrustning",
                "items": [
                    {"type": "checkbox", "label": "Hjälm"},
                    {"type": "checkbox", "label": "Skyddsglasögon"},
                    {"type": "checkbox", "label": "Hörselskydd"},
                    {"type": "checkbox", "label": "Andningsskydd"},
                    {"type": "checkbox", "label": "Skyddshandskar"},
                    {"type": "checkbox", "label": "Säkerhetsskor"},
                    {"type": "checkbox", "label": "Varselkläder"}
                ]
            },
            {
                "title": "Arbetsmiljö",
                "items": [
                    {"type": "checkbox", "label": "Räcken och skyddsräcken"},
                    {"type": "checkbox", "label": "Fallskyddsutrustning"},
                    {"type": "checkbox", "label": "Brandsläckare tillgänglig"},
                    {"type": "checkbox", "label": "Nödutgångar fria"},
                    {"type": "checkbox", "label": "Belysning tillräcklig"},
                    {"type": "checkbox", "label": "Ventilation fungerar"},
                    {"type": "checkbox", "label": "Första hjälpen utrustning"},
                    {"type": "checkbox", "label": "Skyltar och varningar uppsatta"}
                ]
            },
            {
                "title": "Verktyg & Maskiner",
                "items": [
                    {"type": "checkbox", "label": "Elverktyg jordfelsbrytare"},
                    {"type": "checkbox", "label": "Skyddskåpor på plats"},
                    {"type": "checkbox", "label": "Verktyg i gott skick"},
                    {"type": "checkbox", "label": "Stegar säkra"},
                    {"type": "checkbox", "label": "Ställningar godkända"}
                ]
            },
            {
                "title": "Dokumentation"},
                "items": [
                    {"type": "checkbox", "label": "Riskanalys genomförd"},
                    {"type": "checkbox", "label": "Arbetsbeskrivning finns"},
                    {"type": "checkbox", "label": "Säkerhetsdatablad tillgängliga"},
                    {"type": "photo", "label": "Foto på arbetsplatsen"},
                    {"type": "text", "label": "Avvikelser och åtgärder", "multiline": true}
                ]
            }
        ]
    }'::jsonb,
    NOW(),
    NOW()
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE checklist_templates IS 'Includes public Swedish construction standard templates';

