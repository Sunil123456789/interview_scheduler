from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_aom_is_interviewer'),
    ]

    operations = [
        migrations.AddField(
            model_name='candidate',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
