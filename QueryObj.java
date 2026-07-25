import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Request body for POST /sumary — matches DataTables server-side processing protocol.
 */
public record QueryObj(
    int draw,
    int start,
    int length,
    Search search,
    List<Order> order,
    List<Column> columns
) {
    public record Search(
        String value,
        boolean regex
    ) {}

    public record Order(
        int column,
        String dir   // "asc" or "desc"
    ) {}

    public record Column(
        String data,
        String name,
        boolean searchable,
        boolean orderable,
        Search search
    ) {}
}
