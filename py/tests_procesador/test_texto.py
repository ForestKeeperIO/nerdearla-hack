import datetime as dt

from procesador.mapeo import mapear
from procesador.texto import folio_valido, parse_edad, parse_fecha, parse_id


def test_fechas():
    assert parse_fecha("12/03/2026") == dt.date(2026, 3, 12)
    assert parse_fecha("2026-03-12 00:00:00") == dt.date(2026, 3, 12)
    assert parse_fecha(46093) == dt.date(2026, 3, 12)
    assert parse_fecha("12 de marzo de 2026") == dt.date(2026, 3, 12)
    assert parse_fecha("20260312") == dt.date(2026, 3, 12)
    assert parse_fecha("31/02/2026") is None and parse_fecha("hola") is None and parse_fecha("S/D") is None


def test_id_eira_acepta_ambos_ordenes():
    assert parse_id("LMM19840312") == ("LMM19840312", dt.date(1984, 3, 12))
    assert parse_id("19840312-lmm") == ("LMM19840312", dt.date(1984, 3, 12))
    assert parse_id("XX-0000") is None and parse_id("LMM19841312") is None


def test_edad_y_folio():
    assert parse_edad("42 años") == 42 and parse_edad("") is None
    assert not folio_valido("EIRA-AAAA-BBBB") and not folio_valido("abc")


def test_mapeo_encabezados_heterogeneos():
    m = {d["campo"]: d["encabezado"] for d in mapear(
        ["Participante", "Clave EIRA", "Municipio de residencia", "Tipo de estudio", "Fecha de nac.", "Asistencia (Sí/No)", "Fecha"])}
    assert m["nombre"] == "Participante" and m["id_eira"] == "Clave EIRA" and m["ciudad"].startswith("Municipio")
    assert m["estudio"] == "Tipo de estudio" and m["fecha_nacimiento"] == "Fecha de nac." and m["fecha"] == "Fecha"
