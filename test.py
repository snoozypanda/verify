import pandas as pd

def decoder(url):
    t = pd.read_html(url)[0]
    pts = {}

    for _, row in t.iterrows():
        x = int(row["x-coordinate"])
        y = int(row["y-coordinate"])
        pts[(x, y)] = row["Character"]

    width = t["x-coordinate"].max()
    height = t["y-coordinate"].max()

    for y in range(height, -1, -1):
        line = ""
        for x in range(width + 1):
            line += pts.get((x, y), " ")
        print(line)

# url = "https://docs.google.com/document/u/0/d/e/2PACX-1vTMOmshQe8YvaRXi6gEPKKlsC6UpFJSMAk4mQjLm_u1gmHdVVTaeh7nBNFBRlui0sTZ-snGwZM4DBCT/pub?pli=1"
url = "https://docs.google.com/document/d/e/2PACX-1vSvM5gDlNvt7npYHhp_XfsJvuntUhq184By5xO_pA4b_gCWeXb6dM6ZxwN8rE6S4ghUsCj2VKR21oEP/pub"
decoder(url)