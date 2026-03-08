from django.db import models

# Create your models here.
import uuid

class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents')
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_type=models.CharField(max_length=50)
    # Path to the physical directory
    
    # "Long Metadata" storage - PostgreSQL JSONB is perfect for this
    # Use this for: parties, dates, risk scores, summaries, etc.
    metadata = models.JSONField(default=dict, blank=True)
    
    # Status to track background processing (Vectorizing/AI Analysis)
    status = models.CharField(
        max_length=20, 
        choices=[('uploaded', 'Uploaded'), ('processing', 'Processing'), ('ready', 'Ready')],
        default='uploaded'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)