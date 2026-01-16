import csv
import json
import os

csv_path = '/Users/lixuanying/Documents/GitHub/nanobananaultra/docs/prompt-scoring/output/quality-filtered-prompts.csv'
html_path = '/Users/lixuanying/Documents/GitHub/nanobananaultra/docs/prompt-scoring/output/prompt_viewer.html'

print(f"Reading CSV from: {csv_path}")

try:
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        data = list(reader)

    print(f"Read {len(data)} rows.")

    columns = [{"title": col} for col in header]
    
    # Simple escaping for the cell render function to avoid breaking script
    # json.dumps handles the data array safely

    html_content = f"""
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prompt CSV Viewer</title>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; background: #f5f5f5; }}
        .container {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        h2 {{ margin-top: 0; }}
        table {{ width: 100%; border-collapse: collapse; table-layout: fixed; }}
        th {{ background: #eee; }}
        td {{ 
            vertical-align: top; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap; 
            cursor: pointer;
            border-bottom: 1px solid #ddd;
        }}
        
        /* Expanded state */
        td.expanded {{ 
            white-space: pre-wrap; 
            word-break: break-all; 
            background-color: #f9f9ff;
        }}
        
        /* Column Widths Strategy */
        th:nth-child(1) {{ width: 50px; }} /* ID */
        th:nth-last-child(1) {{ width: 40%; }} /* Prompt - wide */

    </style>
</head>
<body>
    <div class="container">
        <h2>Prompt Data Viewer</h2>
        <p>📊 <b>点击任意单元格</b>可展开显/隐完整内容。支持搜索和列排序。</p>
        <p><i>Generated for: {os.path.basename(csv_path)}</i></p>
        <table id="example" class="display" style="width:100%"></table>
    </div>

    <script src="https://code.jquery.com/jquery-3.7.0.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script>
        var dataSet = {json.dumps(data)};
        var columns = {json.dumps(columns)};

        $(document).ready(function() {{
            var table = $('#example').DataTable({{
                data: dataSet,
                columns: columns,
                scrollX: true,
                autoWidth: false,
                pageLength: 10,
                order: [[2, 'desc']], // Sort by total_score desc by default (assuming idx 2)
                columnDefs: [
                    {{
                        targets: '_all',
                        render: function ( data, type, row ) {{
                            if (type === 'display') {{
                                if (data == null) return '';
                                // Truncate for display
                                var str = data.toString();
                                if (str.length > 50) {{
                                    // Use a span to hold full data but show truncated
                                    return '<span title="Click to expand">' + str.substr( 0, 50 ) + '...</span>';
                                }}
                                return str;
                            }}
                            return data;
                        }}
                    }}
                ]
            }});

            $('#example tbody').on('click', 'td', function () {{
                var cell = table.cell(this);
                if (!cell.index()) return; // Header click check
                
                var originalData = cell.data();
                var node = $(this);
                
                if (node.hasClass('expanded')) {{
                    node.removeClass('expanded');
                    // Re-render truncated
                    var str = originalData ? originalData.toString() : '';
                    node.html(str.length > 50 ? str.substr(0, 50) + '...' : str);
                }} else {{
                    node.addClass('expanded');
                    // Render full
                    // Simple HTML escape for safety if needed, though usually text() is safer.
                    // But here we set HTML. Let's do basic replacement to respect newlines visually
                    // if we were not using pre-wrap. With pre-wrap, direct text is fine.
                    // But we must escape HTML tags if prompt contains them.
                    var div = document.createElement('div');
                    div.innerText = originalData;
                    node.html(div.innerHTML); 
                }}
            }});
        }});
    </script>
</body>
</html>
    """
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"Successfully generated HTML at: {html_path}")

except Exception as e:
    print(f"FINAL ERROR: {e}")
