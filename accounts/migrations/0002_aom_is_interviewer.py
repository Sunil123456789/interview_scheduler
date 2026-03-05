from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='aom',
            name='is_interviewer',
            field=models.BooleanField(default=True),
        ),
    ]
