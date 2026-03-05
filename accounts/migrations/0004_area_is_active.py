from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_candidate_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='area',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
