import java.util.List;

/**
 * Response body for POST /sumary — matches DataTables server-side processing protocol.
 */
public record DataTableResponse(
    int draw,
    long recordsTotal,
    long recordsFiltered,
    List<DatatableObj> data
) {
    public record DatatableObj(
        long idPersona,
        String name
    ) {}
}
