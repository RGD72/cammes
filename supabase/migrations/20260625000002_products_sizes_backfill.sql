-- Garante que todo produto publique tamanhos em um dos dois formatos suportados
-- (PP/P/M/G ou 36/38/40/42/44). Produtos sem sizes, com array vazio, ou com dados
-- malformados da extração (ex: um único elemento "36,38,40,42,46" em vez de 5
-- elementos separados) recebem o preset padrão pela categoria da peça.
UPDATE public.products
SET sizes = CASE
  WHEN lower(coalesce(description, '')) ~ '(jaqueta|casaco|camiseta|camisa)'
    THEN '["PP","P","M","G"]'::jsonb
  ELSE '["36","38","40","42","44"]'::jsonb
END,
updated_at = now()
WHERE sizes IS NULL
   OR sizes = '[]'::jsonb
   OR NOT (
        sizes <@ '["PP","P","M","G"]'::jsonb
        OR sizes <@ '["36","38","40","42","44"]'::jsonb
      );
