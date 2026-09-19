# Dados

Este projeto usa o [Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce)
— dados reais e anonimizados de ~100 mil pedidos feitos entre 2016 e 2018.

Licença: **CC BY-NC-SA 4.0** (uso não comercial, com atribuição). Por isso os
CSVs não ficam neste repositório — baixe direto do Kaggle:

```bash
pip install kaggle
# configure ~/.kaggle/kaggle.json com sua API key (kaggle.com/settings)
kaggle datasets download -d olistbr/brazilian-ecommerce -p data/raw --unzip
```

Isso cria `data/raw/` com os 9 CSVs originais, que o
[etl/load_to_mysql.py](../etl/load_to_mysql.py) espera encontrar.
